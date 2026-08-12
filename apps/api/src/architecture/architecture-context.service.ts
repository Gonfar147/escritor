import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { extractTextFromTiptapDoc } from '../indexing/text-chunking.util';

const MAX_SCENE_PREVIEW_WORDS = 120; // por escena, para no disparar el tamaño del prompt en novelas largas

/**
 * Arma los distintos "tamaños" de contexto narrativo que necesita Arquitectura
 * para hablar con la IA (punto 24 del prompt): a veces alcanza con Visión + un
 * resumen liviano de la estructura, otras veces hace falta el texto real de
 * cada escena (para descubrir estructura en capítulos ya escritos).
 */
@Injectable()
export class ArchitectureContextService {
  constructor(private readonly prisma: PrismaService) {}

  /** Visión + estructura actual (solo títulos/función/objetivo, sin texto de escenas) — para "Construir con IA". */
  async projectOverview(projectId: string): Promise<string> {
    const [vision, project, parts] = await Promise.all([
      this.prisma.novelVision.findUnique({ where: { projectId } }),
      this.prisma.project.findUnique({ where: { id: projectId } }),
      this.prisma.part.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
        include: {
          sequences: { orderBy: { order: 'asc' }, include: { chapters: { orderBy: { order: 'asc' } } } },
          chapters: { where: { sequenceId: null }, orderBy: { order: 'asc' } },
        },
      }),
    ]);

    const lines: string[] = [];
    lines.push(`Título: ${project?.title ?? '(sin título)'}`);
    if (project?.genre) lines.push(`Género: ${project.genre}${project.subgenre ? ` / ${project.subgenre}` : ''}`);
    if (project?.synopsis) lines.push(`Sinopsis: ${project.synopsis}`);

    if (vision) {
      lines.push('\n--- Visión ---');
      if (vision.premise) lines.push(`Premisa: ${vision.premise}`);
      if (vision.centralTheme) lines.push(`Tema central: ${vision.centralTheme}`);
      if (vision.centralQuestion) lines.push(`Pregunta central: ${vision.centralQuestion}`);
      if (vision.centralConflict) lines.push(`Conflicto central: ${vision.centralConflict}`);
      if (vision.mainGoal) lines.push(`Objetivo principal: ${vision.mainGoal}`);
      if (vision.antagonism) lines.push(`Antagonismo: ${vision.antagonism}`);
      if (vision.expectedEnding) lines.push(`Final previsto: ${vision.expectedEnding}`);
    }

    if (parts.length > 0) {
      lines.push('\n--- Estructura actual ---');
      for (const part of parts) {
        lines.push(`${part.label} "${part.title}"${part.objective ? ` — objetivo: ${part.objective}` : ''}`);
        for (const seq of part.sequences) {
          lines.push(`  Secuencia "${seq.title}"${seq.objective ? ` — objetivo: ${seq.objective}` : ''}`);
          for (const ch of seq.chapters) lines.push(`    Capítulo "${ch.title}"${ch.objective ? ` — objetivo: ${ch.objective}` : ''}`);
        }
        for (const ch of part.chapters) lines.push(`  Capítulo "${ch.title}"${ch.objective ? ` — objetivo: ${ch.objective}` : ''}`);
      }
    } else {
      lines.push('\n(Todavía no hay ningún Acto/Parte creado — la novela arranca de cero.)');
    }

    return lines.join('\n');
  }

  /**
   * Resumen del manuscrito YA ESCRITO (título + primeras palabras de cada escena,
   * con el id real de cada capítulo) — para "Analizar estructura existente". Incluye
   * los ids porque la propuesta de STRUCTURE_DISCOVERY necesita referenciar capítulos
   * reales, no inventar unos nuevos.
   */
  async manuscriptSummaryWithIds(projectId: string): Promise<string> {
    const parts = await this.prisma.part.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: { scenes: { orderBy: { order: 'asc' } } },
        },
      },
    });

    const lines: string[] = [];
    for (const part of parts) {
      for (const chapter of part.chapters) {
        lines.push(`\n### Capítulo [id: ${chapter.id}] — "${chapter.title}"`);
        for (const scene of chapter.scenes) {
          const text = extractTextFromTiptapDoc(scene.content).split(/\s+/).slice(0, MAX_SCENE_PREVIEW_WORDS).join(' ');
          lines.push(`Escena "${scene.title}": ${text || '(vacía)'}`);
        }
      }
    }

    return lines.join('\n') || '(La novela todavía no tiene capítulos con contenido escrito.)';
  }
}
