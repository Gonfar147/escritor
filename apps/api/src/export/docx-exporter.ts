import { Injectable } from '@nestjs/common';
import {
  Document,
  Packer,
  Paragraph,
  TextRun as DocxTextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  BorderStyle,
} from 'docx';
import { Manuscript, ExportOptions } from './manuscript-assembler.service';
import { Block, TextRun } from './tiptap-to-blocks.util';

function runs(rs: TextRun[]): DocxTextRun[] {
  if (rs.length === 0) return [new DocxTextRun('')];
  return rs.map(
    (r) =>
      new DocxTextRun({
        text: r.text,
        bold: r.bold,
        italics: r.italic,
        underline: r.underline ? {} : undefined,
        strike: r.strike,
      }),
  );
}

function blockToParagraphs(block: Block): Paragraph[] {
  switch (block.type) {
    case 'paragraph':
      return [new Paragraph({ children: runs(block.runs), spacing: { after: 160 } })];
    case 'heading':
      return [
        new Paragraph({
          children: runs(block.runs),
          heading: block.level === 1 ? HeadingLevel.HEADING_1 : block.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 160 },
        }),
      ];
    case 'blockquote':
      return [
        new Paragraph({
          children: runs(block.runs.map((r) => ({ ...r, italic: true }))),
          indent: { left: 720 },
          spacing: { after: 160 },
        }),
      ];
    case 'bulletItem':
      return [new Paragraph({ children: runs(block.runs), bullet: { level: 0 }, spacing: { after: 80 } })];
    case 'orderedItem':
      return [new Paragraph({ children: runs(block.runs), numbering: { reference: 'export-ordered-list', level: 0 }, spacing: { after: 80 } })];
    case 'sceneBreak':
      return [new Paragraph({ text: '· · ·', alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } })];
  }
}

@Injectable()
export class DocxExporter {
  async export(manuscript: Manuscript, opts: ExportOptions): Promise<Buffer> {
    const children: Paragraph[] = [];

    // Portada simple
    children.push(
      new Paragraph({ text: manuscript.title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { before: 2000, after: 200 } }),
    );
    if (manuscript.subtitle) {
      children.push(new Paragraph({ text: manuscript.subtitle, alignment: AlignmentType.CENTER, spacing: { after: 400 } }));
    }
    if (manuscript.author) {
      children.push(new Paragraph({ text: manuscript.author, alignment: AlignmentType.CENTER, spacing: { after: 200 } }));
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));

    const multiplePartTitles = manuscript.parts.length > 1;

    for (const part of manuscript.parts) {
      if (opts.includePartTitles && multiplePartTitles) {
        children.push(new Paragraph({ text: part.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 400 } }));
      }

      for (const chapter of part.chapters) {
        children.push(
          new Paragraph({
            text: chapter.title,
            heading: HeadingLevel.HEADING_1,
            pageBreakBefore: !(opts.includePartTitles && multiplePartTitles && chapter === part.chapters[0]),
            spacing: { before: 400, after: 300 },
          }),
        );

        chapter.scenes.forEach((scene, idx) => {
          if (idx > 0) children.push(new Paragraph({ text: '· · ·', alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 } }));
          if (opts.includeSceneTitles) {
            children.push(new Paragraph({ text: scene.title, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 160 } }));
          }
          for (const block of scene.blocks) children.push(...blockToParagraphs(block));
        });
      }
    }

    const doc = new Document({
      numbering: {
        config: [{ reference: 'export-ordered-list', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }] }],
      },
      styles: {
        default: {
          document: { run: { font: 'Georgia', size: 24 } }, // 12pt
        },
      },
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    return Packer.toBuffer(doc);
  }
}
