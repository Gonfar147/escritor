import { Injectable, Logger } from '@nestjs/common';
import { Prisma, EmbeddingEntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from '../indexing/embeddings.service';
import { toVectorLiteral } from '../indexing/text-chunking.util';

export interface RetrievedChunk {
  entityType: EmbeddingEntityType;
  entityId: string;
  title: string;
  content: string;
  similarity: number;
}

/**
 * Recuperación semántica para RAG. La condición `"projectId" = $projectId` va
 * DENTRO de la misma consulta SQL que hace la búsqueda por vector — no se filtra
 * después en memoria — para que el aislamiento entre proyectos (y por lo tanto
 * entre novelas/usuarios distintos) sea una garantía de la propia query, no una
 * responsabilidad de quien la llama.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  async search(
    projectId: string,
    query: string,
    opts: { limit?: number; entityTypes?: EmbeddingEntityType[] } = {},
  ): Promise<RetrievedChunk[]> {
    if (!this.embeddings.isConfigured) {
      this.logger.warn('Voyage AI no configurado: RAG deshabilitado, devolviendo sin contexto');
      return [];
    }

    const queryVector = await this.embeddings.embedOne(query, 'query');
    if (queryVector.length === 0) return [];

    const limit = opts.limit ?? 8;
    const vectorLiteral = toVectorLiteral(queryVector);

    // 1 - distancia_coseno = similitud_coseno (pgvector expone la distancia con el operador <=>)
    const typeFilter =
      opts.entityTypes?.length
        ? Prisma.sql`AND "entityType" IN (${Prisma.join(opts.entityTypes.map((t) => Prisma.sql`${t}::"EmbeddingEntityType"`))})`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT "entityType", "entityId", title, content,
             1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "EmbeddingChunk"
      WHERE "projectId" = ${projectId}
        AND embedding IS NOT NULL
        ${typeFilter}
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      entityType: r.entityType,
      entityId: r.entityId,
      title: r.title,
      content: r.content,
      similarity: Number(r.similarity),
    }));
  }

  /** Arma el bloque de contexto para inyectar en el prompt del sistema, con la fuente de cada fragmento. */
  static formatContext(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) return '';
    return chunks
      .map((c, i) => `[${i + 1}] (${entityTypeLabel(c.entityType)}: ${c.title})\n${c.content}`)
      .join('\n\n---\n\n');
  }
}

export function entityTypeLabel(type: EmbeddingEntityType): string {
  const labels: Record<EmbeddingEntityType, string> = {
    SCENE: 'Escena',
    CHARACTER: 'Personaje',
    LOCATION: 'Lugar',
    OBJECT: 'Objeto',
    WORLD_ENTRY: 'Entrada de mundo',
    TIMELINE_EVENT: 'Evento de línea temporal',
    RESEARCH_ITEM: 'Material de investigación',
    NOTE: 'Nota',
  };
  return labels[type];
}
