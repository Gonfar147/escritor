import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Manuscript, ExportOptions } from './manuscript-assembler.service';
import { Block, TextRun, plainTextFromRuns } from './tiptap-to-blocks.util';

const BODY_FONT = 'Times-Roman';
const BODY_FONT_BOLD = 'Times-Bold';
const BODY_FONT_ITALIC = 'Times-Italic';
const BODY_SIZE = 12;

@Injectable()
export class PdfExporter {
  async export(manuscript: Manuscript, opts: ExportOptions): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A5', margins: { top: 60, bottom: 60, left: 56, right: 56 }, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    // Portada
    doc.font(BODY_FONT_BOLD).fontSize(26).text(manuscript.title, { align: 'center' });
    if (manuscript.subtitle) {
      doc.moveDown(0.5).font(BODY_FONT).fontSize(14).text(manuscript.subtitle, { align: 'center' });
    }
    if (manuscript.author) {
      doc.moveDown(2).font(BODY_FONT).fontSize(12).text(manuscript.author, { align: 'center' });
    }

    const multiplePartTitles = manuscript.parts.length > 1;

    for (const part of manuscript.parts) {
      if (opts.includePartTitles && multiplePartTitles) {
        doc.addPage();
        doc.font(BODY_FONT_BOLD).fontSize(20).text(part.title, { align: 'center' });
      }

      for (const chapter of part.chapters) {
        doc.addPage();
        doc.font(BODY_FONT_BOLD).fontSize(16).text(chapter.title, { align: 'left' });
        doc.moveDown(1);

        chapter.scenes.forEach((scene, idx) => {
          if (idx > 0) {
            doc.moveDown(1);
            doc.font(BODY_FONT).fontSize(BODY_SIZE).text('· · ·', { align: 'center' });
            doc.moveDown(1);
          }
          if (opts.includeSceneTitles) {
            doc.font(BODY_FONT_BOLD).fontSize(13).text(scene.title);
            doc.moveDown(0.5);
          }
          for (const block of scene.blocks) this.renderBlock(doc, block);
        });
      }
    }

    this.paginate(doc);
    doc.end();
    return done;
  }

  private renderBlock(doc: PDFKit.PDFDocument, block: Block) {
    switch (block.type) {
      case 'paragraph':
        this.renderRuns(doc, block.runs);
        doc.moveDown(0.6);
        break;
      case 'heading': {
        const size = block.level === 1 ? 16 : block.level === 2 ? 14 : 13;
        doc.font(BODY_FONT_BOLD).fontSize(size).text(plainTextFromRuns(block.runs));
        doc.moveDown(0.5);
        break;
      }
      case 'blockquote':
        doc.font(BODY_FONT_ITALIC).fontSize(BODY_SIZE).text(plainTextFromRuns(block.runs), { indent: 20 });
        doc.moveDown(0.5);
        break;
      case 'bulletItem':
        doc.font(BODY_FONT).fontSize(BODY_SIZE).text(`•  ${plainTextFromRuns(block.runs)}`, { indent: 10 });
        doc.moveDown(0.2);
        break;
      case 'orderedItem':
        doc.font(BODY_FONT).fontSize(BODY_SIZE).text(plainTextFromRuns(block.runs), { indent: 10 });
        doc.moveDown(0.2);
        break;
      case 'sceneBreak':
        doc.moveDown(0.5);
        doc.font(BODY_FONT).fontSize(BODY_SIZE).text('· · ·', { align: 'center' });
        doc.moveDown(0.5);
        break;
    }
  }

  /** pdfkit no soporta runs con distinto estilo dentro de la misma línea de forma directa: se concatena con `continued`. */
  private renderRuns(doc: PDFKit.PDFDocument, runs: TextRun[]) {
    doc.font(BODY_FONT).fontSize(BODY_SIZE);
    if (runs.length === 0) {
      doc.text(' ');
      return;
    }
    runs.forEach((r, i) => {
      const font = r.bold && r.italic ? BODY_FONT_BOLD : r.bold ? BODY_FONT_BOLD : r.italic ? BODY_FONT_ITALIC : BODY_FONT;
      doc.font(font).text(r.text, { continued: i < runs.length - 1, underline: r.underline, strike: r.strike });
    });
  }

  /** Agrega número de página al pie, una vez que ya se conoce el total de páginas. */
  private paginate(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      const pageNumber = i + 1;
      doc
        .font(BODY_FONT)
        .fontSize(9)
        .text(String(pageNumber), 0, doc.page.height - 40, { align: 'center', width: doc.page.width });
    }
  }
}
