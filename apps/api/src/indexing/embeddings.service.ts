import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const EMBEDDING_DIMENSIONS = 1024; // voyage-3.5

type VoyageInputType = 'document' | 'query';

/**
 * Wrapper sobre la API REST de Voyage AI (https://docs.voyageai.com).
 * Ni Anthropic ni Gemini se usan acá — Gemini resuelve el razonamiento
 * (chat, escritura asistida) y Voyage sigue vectorizando texto para RAG.
 * Modelo por defecto: voyage-3.5, 1024 dimensiones, general-purpose.
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('VOYAGE_API_KEY');
    this.model = this.config.get<string>('VOYAGE_MODEL') ?? 'voyage-3.5';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  /** Embebe uno o más textos. `inputType` ajusta el embedding para documento vs. consulta de búsqueda. */
  async embed(texts: string[], inputType: VoyageInputType = 'document'): Promise<number[][]> {
    if (texts.length === 0) return [];
    if (!this.apiKey) {
      this.logger.warn('VOYAGE_API_KEY no configurada: se omite la generación de embeddings');
      return texts.map(() => []);
    }

    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
        input_type: inputType,
        output_dimension: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Voyage AI respondió ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }

  async embedOne(text: string, inputType: VoyageInputType = 'document'): Promise<number[]> {
    const [embedding] = await this.embed([text], inputType);
    return embedding ?? [];
  }
}
