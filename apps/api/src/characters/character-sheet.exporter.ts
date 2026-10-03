import { Injectable } from '@nestjs/common';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } from 'docx';
import PDFDocument from 'pdfkit';

export type SheetFormat = 'txt' | 'docx' | 'pdf';

export const SHEET_FORMATS: SheetFormat[] = ['txt', 'docx', 'pdf'];

interface SheetField {
  label: string;
  value: string;
}
interface SheetSection {
  title: string;
  fields: SheetField[];
}
export interface CharacterSheet {
  name: string;
  status: string;
  image: { buffer: Buffer; type: 'jpg' | 'png' | 'gif' | 'bmp' } | null;
  sections: SheetSection[];
}

const STATUS_LABELS: Record<string, string> = {
  ALIVE: 'Vivo',
  DEAD: 'Muerto',
  MISSING: 'Desaparecido',
  UNKNOWN: 'Desconocido',
};

const list = (v?: string[] | null) => (v && v.length ? v.join(', ') : '');
const str = (v?: string | number | null) => (v === null || v === undefined ? '' : String(v).trim());

/** Decodifica una foto guardada como data URL (la que sube el formulario). Las URLs http(s) no se descargan. */
function decodeImage(photoUrl?: string | null): CharacterSheet['image'] {
  if (!photoUrl) return null;
  const m = photoUrl.match(/^data:image\/(png|jpe?g|gif|bmp);base64,(.+)$/i);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  const type = raw === 'jpeg' || raw === 'jpg' ? 'jpg' : (raw as 'png' | 'gif' | 'bmp');
  return { buffer: Buffer.from(m[2], 'base64'), type };
}

export function buildSheet(c: any, arc: any | null): CharacterSheet {
  const sections: SheetSection[] = [
    {
      title: 'Información general',
      fields: [
        { label: 'Alias', value: list(c.aliases) },
        { label: 'Edad', value: str(c.age) },
        { label: 'Pronombres', value: str(c.pronouns) },
        { label: 'Estado', value: STATUS_LABELS[c.status] ?? '' },
        { label: 'Profesión', value: str(c.profession) },
      ],
    },
    {
      title: 'Apariencia',
      fields: [
        { label: 'Descripción física', value: str(c.appearance) },
        { label: 'Colores asociados', value: list(c.colors) },
        { label: 'Símbolos', value: list(c.symbols) },
      ],
    },
    {
      title: 'Personalidad y arco narrativo',
      fields: [
        { label: 'Virtudes', value: list(c.virtues) },
        { label: 'Defectos', value: list(c.flaws) },
        { label: 'Objetivos', value: str(c.goals) },
        { label: 'Motivaciones', value: str(c.motivations) },
        { label: 'Miedos', value: str(c.fears) },
        { label: 'Conflictos', value: str(c.conflicts) },
        { label: 'Arco narrativo', value: str(c.arc) },
        { label: 'Secretos', value: str(c.secrets) },
        { label: 'Mentiras', value: str(c.lies) },
        { label: 'Frases típicas', value: list(c.typicalPhrases) },
      ],
    },
  ];

  if (arc) {
    sections.push({
      title: 'Arco narrativo (Arquitectura)',
      fields: [
        { label: 'Estado inicial', value: str(arc.initialState) },
        { label: 'Punto de quiebre', value: str(arc.turningPoint) },
        { label: 'Transformación', value: str(arc.transformation) },
        { label: 'Estado final', value: str(arc.finalState) },
        { label: 'Resolución', value: str(arc.resolution) },
        { label: 'Notas', value: str(arc.notes) },
      ],
    });
  }

  return {
    name: c.name,
    status: STATUS_LABELS[c.status] ?? '',
    image: decodeImage(c.photoUrl),
    // Solo se exportan los campos completados
    sections: sections
      .map((s) => ({ ...s, fields: s.fields.filter((f) => f.value) }))
      .filter((s) => s.fields.length > 0),
  };
}

@Injectable()
export class CharacterSheetExporter {
  async export(sheet: CharacterSheet, format: SheetFormat): Promise<{ buffer: Buffer; contentType: string }> {
    if (format === 'txt') return { buffer: this.txt(sheet), contentType: 'text/plain; charset=utf-8' };
    if (format === 'docx') {
      return {
        buffer: await this.docx(sheet),
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    return { buffer: await this.pdf(sheet), contentType: 'application/pdf' };
  }

  private txt(sheet: CharacterSheet): Buffer {
    const lines: string[] = [sheet.name.toUpperCase(), '='.repeat(Math.max(sheet.name.length, 3)), ''];
    for (const s of sheet.sections) {
      lines.push(s.title.toUpperCase(), '-'.repeat(s.title.length));
      for (const f of s.fields) lines.push(`${f.label}: ${f.value}`);
      lines.push('');
    }
    // BOM para que Word/Bloc de notas detecten UTF-8 (acentos)
    return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf-8');
  }

  private async docx(sheet: CharacterSheet): Promise<Buffer> {
    const children: Paragraph[] = [];

    if (sheet.image) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new ImageRun({
              type: sheet.image.type,
              data: sheet.image.buffer,
              transformation: { width: 150, height: 150 }, // la foto se guarda recortada en cuadrado
            }),
          ],
        }),
      );
    }

    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: sheet.name, bold: true })],
      }),
    );

    for (const s of sheet.sections) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 320, after: 120 },
          children: [new TextRun(s.title)],
        }),
      );
      for (const f of s.fields) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: `${f.label}: `, bold: true }), new TextRun(f.value)],
          }),
        );
      }
    }

    const doc = new Document({ sections: [{ children }] });
    return Packer.toBuffer(doc);
  }

  private pdf(sheet: CharacterSheet): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 112;

      if (sheet.image) {
        try {
          doc.image(sheet.image.buffer, (doc.page.width - 140) / 2, doc.y, { fit: [140, 140] });
          doc.y += 152;
        } catch {
          // imagen corrupta: se exporta la ficha sin foto
        }
      }

      doc.font('Helvetica-Bold').fontSize(24).text(sheet.name, { align: 'center', width: pageWidth });
      doc.moveDown(0.8);

      for (const s of sheet.sections) {
        doc.moveDown(0.6);
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#8a6d2f').text(s.title.toUpperCase());
        doc.moveTo(56, doc.y + 2).lineTo(56 + pageWidth, doc.y + 2).strokeColor('#cccccc').lineWidth(0.5).stroke();
        doc.moveDown(0.5).fillColor('#000000');
        for (const f of s.fields) {
          doc.font('Helvetica-Bold').fontSize(10.5).text(`${f.label}: `, { continued: true });
          doc.font('Helvetica').text(f.value);
          doc.moveDown(0.3);
        }
      }

      doc.end();
    });
  }
}
