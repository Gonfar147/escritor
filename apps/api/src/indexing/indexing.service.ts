import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from './embeddings.service';
import { chunkText, extractTextFromTiptapDoc, toVectorLiteral } from './text-chunking.util';
import { characterIndexText, locationIndexText, objectIndexText } from './entity-text.util';
import { EmbeddingEntityType } from '@prisma/client';

/**
 * Indexa contenido del codex para búsqueda semántica (RAG). Se llama en modo
 * "fire-and-forget" desde los servicios de contenido (Scenes, Characters,
 * Locations, Objects, WorldBuilding, Timeline, Research) después de cada
 * create/update — nunca bloquea el guardado del usuario ni propaga errores
 * hacia arriba: si Voyage falla o no está configurado, el contenido se guarda
 * igual y simplemente queda sin indexar hasta el próximo reindex.
 */
@Injectable()
export class IndexingService {
  private readonly logger = new Logger(IndexingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  /** Punto de entrada seguro para llamadas fire-and-forget: nunca rechaza. */
  indexEntityAsync(
    projectId: string,
    entityType: EmbeddingEntityType,
    entityId: string,
    title: string,
    text: string,
  ): void {
    this.indexEntity(projectId, entityType, entityId, title, text).catch((err: unknown) =>
      this.logger.warn(`No se pudo indexar ${entityType}:${entityId} — ${(err as any)?.message ?? err}`),
    );
  }

  removeEntityAsync(entityType: EmbeddingEntityType, entityId: string): void {
    this.prisma.embeddingChunk
      .deleteMany({ where: { entityType, entityId } })
      .catch((err: unknown) =>
        this.logger.warn(`No se pudo desindexar ${entityType}:${entityId} — ${(err as any)?.message ?? err}`),
      );
  }

  async indexEntity(
    projectId: string,
    entityType: EmbeddingEntityType,
    entityId: string,
    title: string,
    text: string,
  ): Promise<void> {
    // Siempre se limpia lo anterior primero: si el texto se achicó, no deben
    // quedar chunks viejos con índices que ya no corresponden.
    await this.prisma.embeddingChunk.deleteMany({ where: { entityType, entityId } });

    const chunks = chunkText(text);
    if (chunks.length === 0) return;
    if (!this.embeddings.isConfigured) {
      this.logger.warn('Voyage AI no configurado: contenido guardado sin indexar');
      return;
    }

    const vectors = await this.embeddings.embed(chunks, 'document');

    await this.prisma.$transaction(
      chunks.map((content, i) => {
        const vector = vectors[i];
        if (!vector || vector.length === 0) {
          // Si Voyage no devolvió embedding para este chunk, igual lo guardamos sin vector
          // para no perder el texto (queda fuera de la búsqueda semántica hasta reindexar).
          return this.prisma.$executeRaw`
            INSERT INTO "EmbeddingChunk" (id, "projectId", "entityType", "entityId", "chunkIndex", title, content, "createdAt", "updatedAt")
            VALUES (${randomUUID()}, ${projectId}, ${entityType}::"EmbeddingEntityType", ${entityId}, ${i}, ${title}, ${content}, now(), now())
          `;
        }
        return this.prisma.$executeRaw`
          INSERT INTO "EmbeddingChunk" (id, "projectId", "entityType", "entityId", "chunkIndex", title, content, embedding, "createdAt", "updatedAt")
          VALUES (${randomUUID()}, ${projectId}, ${entityType}::"EmbeddingEntityType", ${entityId}, ${i}, ${title}, ${content}, ${toVectorLiteral(vector)}::vector, now(), now())
        `;
      }),
    );
  }

  /**
   * Reindexa el proyecto completo desde cero. Se usa para catch-up cuando se
   * activa Voyage por primera vez, o si cambió el modelo/dimensión de embedding.
   * Devuelve la cantidad de entidades procesadas por tipo.
   */
  async reindexProject(projectId: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    const scenes = await this.prisma.scene.findMany({
      where: { chapter: { part: { projectId } } },
      select: { id: true, title: true, content: true },
    });
    for (const s of scenes) {
      await this.indexEntity(projectId, 'SCENE', s.id, s.title, extractTextFromTiptapDoc(s.content));
    }
    counts.scenes = scenes.length;

    const characters = await this.prisma.character.findMany({ where: { projectId } });
    for (const c of characters) {
      await this.indexEntity(projectId, 'CHARACTER', c.id, c.name, characterIndexText(c));
    }
    counts.characters = characters.length;

    const locations = await this.prisma.location.findMany({ where: { projectId } });
    for (const l of locations) {
      await this.indexEntity(projectId, 'LOCATION', l.id, l.name, locationIndexText(l));
    }
    counts.locations = locations.length;

    const objects = await this.prisma.storyObject.findMany({ where: { projectId } });
    for (const o of objects) {
      await this.indexEntity(projectId, 'OBJECT', o.id, o.name, objectIndexText(o));
    }
    counts.objects = objects.length;

    const worldEntries = await this.prisma.worldEntry.findMany({ where: { projectId } });
    for (const w of worldEntries) {
      const text = [w.summary ?? '', extractTextFromTiptapDoc(w.content)].filter(Boolean).join('\n\n');
      await this.indexEntity(projectId, 'WORLD_ENTRY', w.id, w.title, text);
    }
    counts.worldEntries = worldEntries.length;

    const events = await this.prisma.timelineEvent.findMany({ where: { projectId } });
    for (const e of events) {
      const text = [e.description ?? '', e.displayDate ?? ''].filter(Boolean).join('\n');
      await this.indexEntity(projectId, 'TIMELINE_EVENT', e.id, e.title, text);
    }
    counts.timelineEvents = events.length;

    const research = await this.prisma.researchItem.findMany({ where: { projectId } });
    for (const r of research) {
      if (r.content) await this.indexEntity(projectId, 'RESEARCH_ITEM', r.id, r.title, r.content);
    }
    counts.researchItems = research.length;

    const notes = await this.prisma.note.findMany({ where: { projectId } });
    for (const n of notes) {
      await this.indexEntity(projectId, 'NOTE', n.id, n.title ?? 'Nota sin título', n.content);
    }
    counts.notes = notes.length;

    return counts;
  }
}

