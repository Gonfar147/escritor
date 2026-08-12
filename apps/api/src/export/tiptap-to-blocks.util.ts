/**
 * Representación intermedia neutral entre Tiptap (JSON de la escena) y cada
 * formato de salida (DOCX/PDF/EPUB). Cada exportador sabe convertir estos
 * bloques a su propio formato sin tener que entender ProseMirror.
 */
export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}

export type Block =
  | { type: 'paragraph'; runs: TextRun[] }
  | { type: 'heading'; level: 1 | 2 | 3; runs: TextRun[] }
  | { type: 'bulletItem'; runs: TextRun[] }
  | { type: 'orderedItem'; runs: TextRun[] }
  | { type: 'blockquote'; runs: TextRun[] }
  | { type: 'sceneBreak' };

function runsFromInline(nodes: any[]): TextRun[] {
  const runs: TextRun[] = [];
  for (const node of nodes ?? []) {
    if (node.type === 'text' && typeof node.text === 'string') {
      const marks = new Set((node.marks ?? []).map((m: any) => m.type));
      runs.push({
        text: node.text,
        bold: marks.has('bold'),
        italic: marks.has('italic'),
        underline: marks.has('underline'),
        strike: marks.has('strike'),
      });
    } else if (node.type === 'hardBreak') {
      runs.push({ text: '\n' });
    }
  }
  return runs;
}

/** Convierte el doc Tiptap de una escena en una lista de bloques planos, en orden. */
export function tiptapToBlocks(doc: unknown): Block[] {
  const root = doc as any;
  const blocks: Block[] = [];
  if (!root || !Array.isArray(root.content)) return blocks;

  for (const node of root.content) {
    switch (node.type) {
      case 'paragraph': {
        const runs = runsFromInline(node.content);
        if (runs.length) blocks.push({ type: 'paragraph', runs });
        break;
      }
      case 'heading': {
        const level = Math.min(3, Math.max(1, node.attrs?.level ?? 2)) as 1 | 2 | 3;
        blocks.push({ type: 'heading', level, runs: runsFromInline(node.content) });
        break;
      }
      case 'blockquote': {
        for (const child of node.content ?? []) {
          blocks.push({ type: 'blockquote', runs: runsFromInline(child.content) });
        }
        break;
      }
      case 'bulletList': {
        for (const item of node.content ?? []) {
          const para = item.content?.[0];
          blocks.push({ type: 'bulletItem', runs: runsFromInline(para?.content) });
        }
        break;
      }
      case 'orderedList': {
        for (const item of node.content ?? []) {
          const para = item.content?.[0];
          blocks.push({ type: 'orderedItem', runs: runsFromInline(para?.content) });
        }
        break;
      }
      case 'horizontalRule': {
        blocks.push({ type: 'sceneBreak' });
        break;
      }
      default:
        break; // otros nodos (tablas, imágenes embebidas, etc.) quedan fuera del alcance de la exportación por ahora
    }
  }

  return blocks;
}

export function plainTextFromRuns(runs: TextRun[]): string {
  return runs.map((r) => r.text).join('');
}
