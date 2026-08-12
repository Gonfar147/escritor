import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { AnthropicService } from '../ai/anthropic.service';
import { RagService } from '../ai/rag.service';
import { ArchitectureContextService } from '../architecture/architecture-context.service';
import { ThinkWithNotesDto, QueryIdeasDto, SaveInsightAsNoteDto, NoteAiMode } from './dto/note.dto';

interface Insight {
  title: string;
  body: string;
}

const SHARED_RULES = `Reglas:
- Estas notas son pensamientos en progreso del autor, todavía NO son canon de la novela — no asumas que ya están decididas.
- No inventes personajes, lugares, eventos o hechos de la novela que no aparezcan en las notas o en el contexto dado.
- Cada idea que propongas debe ser una tarjeta corta y concreta (2 a 4 oraciones), no un ensayo.
- Son posibilidades para que el autor evalúe, nunca una decisión tomada.
- Generá entre 2 y 5 tarjetas.
- Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin bloques de markdown. Forma exacta:
{ "insights": [ { "title": "string corto", "body": "string" } ] }`;

const MODE_INSTRUCTIONS: Record<NoteAiMode, { task: string; proposalType: string }> = {
  CONNECT: {
    task: 'Encontrá conexiones entre estas notas: relaciones, temas comunes, ideas complementarias, posibles relaciones causales.',
    proposalType: 'NOTE_CONNECT',
  },
  GENERATE_IDEAS: {
    task: 'A partir de estas notas, proponé nuevas posibilidades narrativas: giros, conflictos, escenas, personajes, acontecimientos, consecuencias.',
    proposalType: 'NOTE_GENERATE_IDEAS',
  },
  DEEPEN: {
    task: 'Profundizá en las implicaciones de estas ideas: temas, filosofía, psicología, consecuencias narrativas, significado.',
    proposalType: 'NOTE_DEEPEN',
  },
  FIND_CONFLICTS: {
    task: 'Encontrá posibles conflictos narrativos derivados de estas notas: entre personajes, internos, sociales, tecnológicos, filosóficos, contradicciones dramáticas útiles para la trama.',
    proposalType: 'NOTE_FIND_CONFLICTS',
  },
  BUILD: {
    task: '¿Cómo podrían estas ideas convertirse en una trama, secuencia, capítulo o escena concreta? Sugerí una posible estructura.',
    proposalType: 'NOTE_BUILD',
  },
  FIND_CONTRADICTIONS: {
    task: 'Buscá contradicciones, incompatibilidades, problemas de continuidad o inconsistencias entre estas notas (y con el contexto de la novela si corresponde). Explicá el problema con claridad — NO lo corrijas ni propongas cómo resolverlo.',
    proposalType: 'NOTE_FIND_CONTRADICTIONS',
  },
};

@Injectable()
export class NotesAiService {
  private readonly logger = new Logger(NotesAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly anthropic: AnthropicService,
    private readonly rag: RagService,
    private readonly context: ArchitectureContextService,
  ) {}

  /**
   * "Pensar con estas notas" (punto 13): la IA recibe EXCLUSIVAMENTE las notas
   * seleccionadas + un contexto mínimo de la novela (punto 25) — nunca toda la
   * novela completa. Es de solo lectura (no modifica ninguna nota), por eso
   * alcanza con `assertMember` en vez de exigir rol de escritura.
   */
  async thinkWithNotes(userId: string, projectId: string, dto: ThinkWithNotesDto) {
    await this.access.assertMember(userId, projectId);

    const notes = await this.prisma.note.findMany({
      where: { id: { in: dto.noteIds }, projectId },
      include: { noteTags: { include: { tag: true } } },
    });
    if (notes.length === 0) {
      throw new NotFoundException('Ninguna de las notas seleccionadas existe en este proyecto');
    }

    const mode = MODE_INSTRUCTIONS[dto.mode];
    const overview = await this.context.projectOverview(projectId);
    const notesBlock = notes
      .map((n: (typeof notes)[number], i: number) => {
        const tags = n.noteTags.map((nt: (typeof n.noteTags)[number]) => `#${nt.tag.name}`).join(' ');
        return `[Nota ${i + 1}]${n.title ? ` "${n.title}"` : ''}\n${n.content}${tags ? `\nTags: ${tags}` : ''}`;
      })
      .join('\n\n');

    const userPrompt = `Contexto mínimo de la novela:\n${overview}\n\n--- Notas seleccionadas ---\n${notesBlock}\n\nTarea: ${mode.task}`;

    const raw = await this.anthropic.complete([{ role: 'user', content: userPrompt }], {
      system: `Sos un asistente creativo que ayuda a un/a escritor/a a pensar sobre notas sueltas de su novela.\n\n${SHARED_RULES}`,
      maxTokens: 2000,
    });

    const parsed = parseJsonResponse<{ insights: Insight[] }>(raw, this.logger);
    if (!parsed?.insights?.length) {
      throw new BadRequestException('La IA no pudo generar ninguna idea a partir de estas notas. Probá con otras notas o reformulá el pedido.');
    }

    return this.prisma.aiProposal.create({
      data: {
        projectId,
        type: mode.proposalType as any,
        content: { insights: parsed.insights, sourceNoteIds: dto.noteIds } as any,
        contextSummary: `Modo: ${dto.mode}. Notas de origen: ${notes.map((n: (typeof notes)[number]) => n.title ?? n.id).join(', ')}`.slice(0, 2000),
      },
    });
  }

  /**
   * "Consultar mis ideas" (punto 19): búsqueda semántica SOLO sobre notas
   * (RagService.search con entityTypes: ['NOTE']) — nunca inventa que existe
   * una nota cuando no existe, porque la respuesta se ancla a lo recuperado.
   */
  async queryIdeas(userId: string, projectId: string, dto: QueryIdeasDto) {
    await this.access.assertMember(userId, projectId);

    const chunks = await this.rag.search(projectId, dto.question, { entityTypes: ['NOTE'], limit: 10 });

    if (chunks.length === 0) {
      const proposal = await this.prisma.aiProposal.create({
        data: {
          projectId,
          type: 'NOTE_QUERY',
          content: {
            question: dto.question,
            answer: 'No encontré ninguna nota relacionada con esa pregunta en tu archivo de ideas.',
            sourceNoteIds: [],
          } as any,
          contextSummary: `Pregunta: ${dto.question}`.slice(0, 2000),
        },
      });
      return proposal;
    }

    const contextBlock = RagService.formatContext(chunks);
    const raw = await this.anthropic.complete(
      [{ role: 'user', content: `Notas del archivo de ideas del autor:\n\n${contextBlock}\n\nPregunta del autor: ${dto.question}` }],
      {
        system: `Sos un asistente que ayuda a un/a escritor/a a explorar su propio archivo de ideas y notas.
Respondé la pregunta del autor usando EXCLUSIVAMENTE las notas que se te dan como contexto — nunca inventes
que existe una nota que no está en el contexto, ni completes con conocimiento general si el contexto no alcanza:
en ese caso decilo explícitamente. Explicá las conexiones entre las notas relevantes cuando las haya. Respondé
en un párrafo breve o una lista corta, en texto plano (no JSON).`,
        maxTokens: 1200,
      },
    );

    return this.prisma.aiProposal.create({
      data: {
        projectId,
        type: 'NOTE_QUERY',
        content: { question: dto.question, answer: raw, sourceNoteIds: chunks.map((c) => c.entityId) } as any,
        contextSummary: `Pregunta: ${dto.question}`.slice(0, 2000),
      },
    });
  }

  /** Historial de resultados de IA de Notas (para poder volver a ver una tarjeta ya generada). */
  async listProposals(userId: string, projectId: string, type?: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.aiProposal.findMany({
      where: {
        projectId,
        type: type ? (type as any) : { in: [...Object.values(MODE_INSTRUCTIONS).map((m) => m.proposalType), 'NOTE_QUERY'] as any },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProposal(userId: string, projectId: string, proposalId: string) {
    await this.access.assertMember(userId, projectId);
    const proposal = await this.prisma.aiProposal.findFirst({ where: { id: proposalId, projectId } });
    if (!proposal) throw new NotFoundException('Propuesta de IA no encontrada en este proyecto');
    return proposal;
  }

  /**
   * "Guardar como nota" (punto 17) sobre UNA tarjeta puntual de un resultado de
   * IA — no sobre la propuesta completa, porque cada tarjeta se acepta o
   * descarta por separado. La nueva nota queda trazada hacia la propuesta y las
   * notas de origen (aiOriginProposalId / aiSourceNoteIds), nunca se genera "canon"
   * automáticamente: esto solo crea una Note más, en estado IDEA, en la Bandeja.
   */
  async saveInsightAsNote(userId: string, projectId: string, proposalId: string, dto: SaveInsightAsNoteDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const proposal = await this.prisma.aiProposal.findFirst({ where: { id: proposalId, projectId } });
    if (!proposal) throw new NotFoundException('Propuesta de IA no encontrada en este proyecto');

    const sourceNoteIds = Array.isArray((proposal.content as any)?.sourceNoteIds)
      ? ((proposal.content as any).sourceNoteIds as string[])
      : [];

    return this.prisma.note.create({
      data: {
        projectId,
        title: dto.title,
        content: dto.content,
        aiOriginProposalId: proposal.id,
        aiSourceNoteIds: sourceNoteIds,
      },
      include: { group: true, noteTags: { include: { tag: true } }, relations: true },
    });
  }
}

function parseJsonResponse<T>(raw: string, logger: Logger): T | null {
  const cleaned = raw.replace(/^```json\s*|^```\s*|```\s*$/gm, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    logger.warn(`No se pudo parsear la respuesta de la IA como JSON: ${(err as Error).message}`);
    return null;
  }
}
