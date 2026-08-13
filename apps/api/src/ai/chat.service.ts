import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { GeminiService, AiMessage } from './gemini.service';
import { RagService } from './rag.service';
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto';

const SYSTEM_PROMPT = `Sos el asistente de escritura integrado en Manuscrito, una plataforma para escritores de novelas.
Respondés preguntas sobre la novela del usuario usando ÚNICAMENTE la información de contexto que te paso a continuación,
extraída del codex del proyecto (personajes, lugares, objetos, mundo, línea temporal, escenas e investigación).

Reglas:
- Si el contexto no alcanza para responder con seguridad, decilo explícitamente en vez de inventar datos ("no encontré eso en tu novela hasta ahora").
- Cuando cites información de una fuente del contexto, referenciala por su título entre corchetes, ej: "según [Personaje: Elena Cruz]...".
- Sé conciso y directo. Esto es una herramienta de trabajo, no un ensayo.
- Podés ayudar también con brainstorming, sugerencias de estilo o continuidad, siempre anclado en lo que ya existe en la novela.
- Respondé siempre en español, salvo que el usuario escriba en otro idioma.`;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly gemini: GeminiService,
    private readonly rag: RagService,
  ) {}

  async createConversation(userId: string, projectId: string, dto: CreateConversationDto) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.chatConversation.create({
      data: { projectId, userId, title: dto.title },
    });
  }

  async listConversations(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.chatConversation.findMany({
      where: { projectId, userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const conv = await this.requireConversation(conversationId, userId);
    return this.prisma.chatConversation.findUnique({
      where: { id: conv.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async deleteConversation(userId: string, conversationId: string) {
    await this.requireConversation(conversationId, userId);
    return this.prisma.chatConversation.delete({ where: { id: conversationId } });
  }

  async sendMessage(userId: string, conversationId: string, dto: SendMessageDto) {
    const conversation = await this.requireConversation(conversationId, userId);

    const history = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const chunks = await this.rag.search(conversation.projectId, dto.content, { limit: 8 });
    const contextBlock = RagService.formatContext(chunks);

    const system = contextBlock
      ? `${SYSTEM_PROMPT}\n\n=== CONTEXTO DE LA NOVELA ===\n${contextBlock}`
      : `${SYSTEM_PROMPT}\n\n(No se encontró contexto relevante indexado para esta consulta; respondé con lo que el usuario te da directamente en el mensaje.)`;

    const messages: AiMessage[] = [
      ...history.map((m) => ({
        role: (m.role === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: dto.content },
    ];

    const reply = await this.gemini.complete(messages, { system, maxTokens: 1500 });

    const sources = chunks.map((c) => ({ entityType: c.entityType, entityId: c.entityId, title: c.title }));

    const [userMsg, assistantMsg] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({ data: { conversationId, role: 'USER', content: dto.content } }),
      this.prisma.chatMessage.create({
        data: { conversationId, role: 'ASSISTANT', content: reply, sources: sources as any },
      }),
    ]);

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        title: conversation.title ?? dto.content.slice(0, 80),
      },
    });

    return { userMessage: userMsg, assistantMessage: assistantMsg };
  }

  private async requireConversation(conversationId: string, userId: string) {
    const conv = await this.prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversación no encontrada');
    await this.access.assertMember(userId, conv.projectId);
    if (conv.userId !== userId) throw new NotFoundException('Conversación no encontrada');
    return conv;
  }
}
