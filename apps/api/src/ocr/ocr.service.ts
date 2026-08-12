import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWorker } from 'tesseract.js';
// pdfjs-dist v3 (legacy/Node build, CommonJS) — v4+ pasó a ser ESM-only y complica el
// require() en un proyecto Nest/CommonJS, así que se fija esta versión a propósito.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js';
import { PrismaService } from '../prisma/prisma.service';
import { IndexingService } from '../indexing/indexing.service';
import { NapiCanvasFactory } from './napi-canvas-factory';

// Debajo de este umbral de caracteres, se asume que la página del PDF no tiene
// capa de texto real (es una imagen escaneada) y se manda a OCR.
const MIN_CHARS_PER_PAGE_TEXT_LAYER = 20;
// Escala de rasterizado: un PDF nace a 72dpi: 2.0 ≈ 144dpi, buen balance entre
// precisión de OCR y tiempo/memoria de render por página.
const RENDER_SCALE = 2.0;

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

/**
 * Extrae texto de materiales de investigación (Módulo 9) para que queden
 * buscables e indexables (RAG) igual que una nota manual:
 *  - PDF: intenta primero la capa de texto embebida (rápido, exacto, gratis);
 *    si una página no la tiene (o es insuficiente), se rasteriza esa página y
 *    se OCRea con Tesseract — soporta PDFs mixtos (páginas de texto + escaneadas).
 *  - IMAGE: se OCRea directamente.
 * Se corre siempre en background (`processAsync`), nunca bloquea el guardado
 * del ResearchItem — mismo criterio que la indexación semántica.
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly maxPages: number;
  private readonly languages: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly indexing: IndexingService,
    private readonly config: ConfigService,
  ) {
    this.maxPages = Number(this.config.get('OCR_MAX_PDF_PAGES') ?? 25);
    this.languages = this.config.get<string>('OCR_LANGUAGES') ?? 'spa+eng';
  }

  processAsync(researchItemId: string): void {
    this.prisma.researchItem
      .update({ where: { id: researchItemId }, data: { ocrStatus: 'PENDING' } })
      .then(() => this.process(researchItemId))
      .catch((err: unknown) =>
        this.logger.warn(`No se pudo iniciar OCR de ${researchItemId} — ${(err as any)?.message ?? err}`),
      );
  }

  async process(researchItemId: string): Promise<void> {
    const item = await this.prisma.researchItem.findUnique({ where: { id: researchItemId } });
    if (!item || !item.fileUrl) return;

    try {
      const buffer = await this.download(item.fileUrl);
      const isImage = item.type === 'IMAGE' || (item.mimeType?.startsWith('image/') ?? false);
      const isPdf = item.type === 'PDF' || item.mimeType === 'application/pdf';

      let text = '';
      if (isImage) {
        text = await this.ocrImageBuffer(buffer);
      } else if (isPdf) {
        text = await this.extractPdf(buffer);
      } else {
        // Word/Excel/Audio/Video/Otro: fuera del alcance de este módulo de OCR.
        await this.prisma.researchItem.update({ where: { id: researchItemId }, data: { ocrStatus: 'NONE' } });
        return;
      }

      await this.prisma.researchItem.update({
        where: { id: researchItemId },
        data: { content: text || undefined, ocrStatus: text ? 'DONE' : 'FAILED' },
      });

      if (text) {
        this.indexing.indexEntityAsync(item.projectId, 'RESEARCH_ITEM', item.id, item.title, text);
      }
    } catch (err: any) {
      this.logger.warn(`OCR falló para ${researchItemId} — ${err?.message ?? err}`);
      await this.prisma.researchItem
        .update({ where: { id: researchItemId }, data: { ocrStatus: 'FAILED' } })
        .catch(() => undefined);
    }
  }

  private async download(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
    const pageCount = Math.min(doc.numPages, this.maxPages);

    let worker: TesseractWorker | null = null;
    const pageTexts: string[] = [];

    try {
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const layerText = textContent.items
          .map((i: any) => ('str' in i ? i.str : ''))
          .join(' ')
          .trim();

        if (layerText.length >= MIN_CHARS_PER_PAGE_TEXT_LAYER) {
          pageTexts.push(layerText);
          continue;
        }

        worker = worker ?? (await createWorker(this.languages));
        const png = await this.rasterizePage(page);
        const {
          data: { text: ocrText },
        } = await worker.recognize(png);
        pageTexts.push(ocrText.trim());
      }
    } finally {
      if (worker) await worker.terminate();
    }

    return pageTexts.filter(Boolean).join('\n\n').trim();
  }

  private async rasterizePage(page: any): Promise<Buffer> {
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const factory = new NapiCanvasFactory();
    const canvasAndContext = factory.create(viewport.width, viewport.height);
    await page.render({ canvasContext: canvasAndContext.context, viewport, canvasFactory: factory }).promise;
    const buffer: Buffer = canvasAndContext.canvas.toBuffer('image/png');
    factory.destroy(canvasAndContext);
    return buffer;
  }

  private async ocrImageBuffer(buffer: Buffer): Promise<string> {
    const worker = await createWorker(this.languages);
    try {
      const {
        data: { text },
      } = await worker.recognize(buffer);
      return text.trim();
    } finally {
      await worker.terminate();
    }
  }
}
