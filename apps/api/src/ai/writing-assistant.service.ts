import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { AnthropicService } from './anthropic.service';
import { RagService } from './rag.service';
import { extractTextFromTiptapDoc } from '../indexing/text-chunking.util';
import { ContinueSceneDto, RewriteTextDto, BrainstormDto, DescribeEntityDto } from './dto/assist.dto';

const BRAINSTORM_LABELS: Record<string, string> = {
  PLOT: 'ideas de trama',
  DIALOGUE: 'líneas de diálogo',
  CHARACTER: 'ideas de personaje',
  SCENE_IDEA: 'ideas de escena',
  TWIST: 'giros narrativos',
  OTHER: 'ideas',
};

@Injectable()
export class WritingAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly anthropic: AnthropicService,
    private readonly rag: RagService,
  ) {}

  /** Continúa la escritura de una escena a partir de su contenido actual + contexto del codex. */
  async continueScene(userId: string, dto: ContinueSceneDto) {
    const projectId = await this.access.projectIdForScene(dto.sceneId);
    await this.access.assertMember(userId, projectId);

    const scene = await this.prisma.scene.findUnique({ where: { id: dto.sceneId } });
    if (!scene) throw new NotFoundException('Escena no encontrada');

    const sceneText = extractTextFromTiptapDoc(scene.content);
    const tail = sceneText.split(/\s+/).slice(-400).join(' '); // últimas ~400 palabras como ancla

    const chunks = await this.rag.search(projectId, `${scene.title}\n${tail}`, { limit: 6 });
    const context = RagService.formatContext(chunks);

    const system = [
      'Sos un asistente de escritura creativa en español. Continuás una escena de novela manteniendo la voz, el tono y la coherencia con lo ya escrito.',
      'Escribí SOLO la continuación en prosa (2 a 4 párrafos), sin repetir lo que ya está escrito, sin meta-comentarios, sin encabezados.',
      context ? `Contexto del codex de la novela, para mantener coherencia con personajes/lugares/mundo:\n${context}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const userPrompt = [
      `Escena actual, "${scene.title}":`,
      sceneText || '(la escena está vacía todavía)',
      dto.instruction ? `\nIndicación del autor para la continuación: ${dto.instruction}` : '',
      '\nContinuá la escena desde donde quedó.',
    ]
      .filter(Boolean)
      .join('\n');

    const text = await this.anthropic.complete([{ role: 'user', content: userPrompt }], { system, maxTokens: 1200 });
    return { text };
  }

  /** Reescribe un fragmento de texto según una indicación (tono, longitud, punto de vista, etc). */
  async rewriteText(userId: string, projectId: string, dto: RewriteTextDto) {
    await this.access.assertMember(userId, projectId);

    let sceneTitle = '';
    if (dto.sceneId) {
      const scene = await this.prisma.scene.findUnique({ where: { id: dto.sceneId } });
      if (scene) sceneTitle = scene.title;
    }

    const system = [
      'Sos un editor literario en español. Reescribís el fragmento que te pasa el autor siguiendo su indicación,',
      'preservando los hechos narrativos (qué pasa, quién está, qué se dice) salvo que la indicación pida explícitamente cambiarlos.',
      'Devolvé SOLO el texto reescrito, sin comillas, sin explicaciones, sin encabezados.',
    ].join(' ');

    const userPrompt = [
      sceneTitle ? `Fragmento de la escena "${sceneTitle}":` : 'Fragmento a reescribir:',
      dto.text,
      `\nIndicación: ${dto.instruction}`,
    ].join('\n');

    const text = await this.anthropic.complete([{ role: 'user', content: userPrompt }], { system, maxTokens: 1500 });
    return { text };
  }

  /** Brainstorming grounded en el codex del proyecto: trama, diálogo, personajes, escenas, giros. */
  async brainstorm(userId: string, projectId: string, dto: BrainstormDto) {
    await this.access.assertMember(userId, projectId);

    const chunks = await this.rag.search(projectId, dto.prompt, { limit: 10 });
    const context = RagService.formatContext(chunks);

    const system = [
      `Sos un asistente de brainstorming narrativo en español, especializado en ${BRAINSTORM_LABELS[dto.kind] ?? 'ideas'}.`,
      'Generá entre 4 y 6 opciones concretas y variadas entre sí (no variaciones triviales de la misma idea), como lista numerada breve.',
      'Cada opción: 1-3 líneas, directa, sin relleno.',
      context ? `Basate en este contexto real de la novela para que las ideas encajen con lo ya establecido:\n${context}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const text = await this.anthropic.complete([{ role: 'user', content: dto.prompt }], { system, maxTokens: 1200 });
    return { text };
  }

  /** Genera una descripción para un personaje, lugar u objeto, grounded en lo que ya existe en el codex. */
  async describeEntity(userId: string, projectId: string, dto: DescribeEntityDto) {
    await this.access.assertMember(userId, projectId);

    const { name, summary } = await this.loadEntitySummary(projectId, dto.entityType, dto.entityId);
    const chunks = await this.rag.search(projectId, `${name} ${summary}`, { limit: 6 });
    const context = RagService.formatContext(chunks);

    const system = [
      'Sos un asistente de escritura creativa en español, especializado en descripciones evocadoras y sensoriales para novelas.',
      dto.style ? `Estilo pedido: ${dto.style}.` : 'Estilo: literario, concreto, sin clichés.',
      'Devolvé SOLO la descripción (1-2 párrafos), sin encabezados ni explicaciones.',
      context ? `Datos ya establecidos en el codex de la novela sobre esta entidad y su entorno:\n${context}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const userPrompt = `Escribí una descripción para: ${name}.\n${summary}`;
    const text = await this.anthropic.complete([{ role: 'user', content: userPrompt }], { system, maxTokens: 800 });
    return { text };
  }

  private async loadEntitySummary(
    projectId: string,
    entityType: DescribeEntityDto['entityType'],
    entityId: string,
  ): Promise<{ name: string; summary: string }> {
    if (entityType === 'CHARACTER') {
      const c = await this.prisma.character.findFirst({ where: { id: entityId, projectId } });
      if (!c) throw new NotFoundException('Personaje no encontrado');
      return { name: c.name, summary: [c.profession, c.appearance].filter(Boolean).join(' — ') };
    }
    if (entityType === 'LOCATION') {
      const l = await this.prisma.location.findFirst({ where: { id: entityId, projectId } });
      if (!l) throw new NotFoundException('Lugar no encontrado');
      return { name: l.name, summary: [l.geography, l.climate].filter(Boolean).join(' — ') };
    }
    const o = await this.prisma.storyObject.findFirst({ where: { id: entityId, projectId } });
    if (!o) throw new NotFoundException('Objeto no encontrado');
    return { name: o.name, summary: o.description ?? '' };
  }
}
