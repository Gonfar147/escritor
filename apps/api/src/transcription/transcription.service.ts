import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { IndexingService } from '../indexing/indexing.service';
import { decodeToPcm16k, pcmDurationSeconds } from './audio-decoder.util';

// Chunking para audios largos: Whisper procesa de a tramos de `chunk_length_s`
// segundos con solapamiento `stride_length_s`, y el pipeline reconstruye la
// transcripción completa — así una nota de voz de 40 minutos no se corta.
const CHUNK_LENGTH_S = 30;
const STRIDE_LENGTH_S = 5;

type AsrPipeline = (audio: Float32Array, options?: Record<string, unknown>) => Promise<{ text: string }>;

/**
 * Transcribe materiales de investigación de tipo AUDIO/VIDEO (Módulo 9) para que
 * queden buscables e indexables igual que una nota manual — mismo criterio que
 * OcrService para PDF/IMAGE, pero con Whisper (local, vía transformers.js) en vez
 * de Tesseract. Nunca bloquea el guardado del ResearchItem: corre en background.
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);
  private readonly model: string;
  private readonly language: string; // 'auto' o un idioma tipo 'spanish'
  private readonly maxMinutes: number;
  private pipelinePromise: Promise<AsrPipeline> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly indexing: IndexingService,
    private readonly config: ConfigService,
  ) {
    this.model = this.config.get<string>('TRANSCRIPTION_MODEL') ?? 'Xenova/whisper-base';
    this.language = this.config.get<string>('TRANSCRIPTION_LANGUAGE') ?? 'spanish';
    this.maxMinutes = Number(this.config.get('TRANSCRIPTION_MAX_MINUTES') ?? 30);
  }

  processAsync(researchItemId: string): void {
    this.prisma.researchItem
      .update({ where: { id: researchItemId }, data: { transcriptionStatus: 'PENDING' } })
      .then(() => this.process(researchItemId))
      .catch((err: unknown) =>
        this.logger.warn(`No se pudo iniciar la transcripción de ${researchItemId} — ${(err as any)?.message ?? err}`),
      );
  }

  async process(researchItemId: string): Promise<void> {
    const item = await this.prisma.researchItem.findUnique({ where: { id: researchItemId } });
    if (!item || !item.fileUrl) return;

    try {
      const buffer = await this.download(item.fileUrl);
      const pcm = await decodeToPcm16k(buffer, this.maxMinutes * 60);
      const seconds = pcmDurationSeconds(pcm);

      if (seconds < 0.3) {
        // Archivo vacío/silencioso o no es audio real; no tiene sentido correr el modelo.
        await this.prisma.researchItem.update({ where: { id: researchItemId }, data: { transcriptionStatus: 'FAILED' } });
        return;
      }

      const transcriber = await this.getPipeline();
      const result = await transcriber(pcm, {
        chunk_length_s: CHUNK_LENGTH_S,
        stride_length_s: STRIDE_LENGTH_S,
        ...(this.language !== 'auto' ? { language: this.language, task: 'transcribe' } : {}),
      });
      const text = (result.text ?? '').trim();

      await this.prisma.researchItem.update({
        where: { id: researchItemId },
        data: { content: text || undefined, transcriptionStatus: text ? 'DONE' : 'FAILED' },
      });

      if (text) {
        this.indexing.indexEntityAsync(item.projectId, 'RESEARCH_ITEM', item.id, item.title, text);
      }
    } catch (err: any) {
      this.logger.warn(`Transcripción falló para ${researchItemId} — ${err?.message ?? err}`);
      await this.prisma.researchItem
        .update({ where: { id: researchItemId }, data: { transcriptionStatus: 'FAILED' } })
        .catch(() => undefined);
    }
  }

  private async download(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  /**
   * El pipeline de Whisper es costoso de instanciar (descarga y carga el modelo
   * ONNX la primera vez) — se memoiza como singleton del proceso para que solo
   * pague ese costo una vez, no en cada transcripción.
   */
  private getPipeline(): Promise<AsrPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = import('@xenova/transformers').then(({ pipeline }) =>
        pipeline('automatic-speech-recognition', this.model) as unknown as Promise<AsrPipeline>,
      );
    }
    return this.pipelinePromise;
  }
}
