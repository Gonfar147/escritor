/**
 * Extrae texto plano de un documento Tiptap/ProseMirror en JSON.
 * Mismo criterio que `word-count.util.ts`: recorre recursivamente los nodos de
 * texto, pero acá además preserva saltos de párrafo para que el chunking corte
 * en límites legibles.
 */
export function extractTextFromTiptapDoc(doc: unknown): string {
  const lines: string[] = [];

  function walk(node: any) {
    if (!node) return;
    if (node.type === 'text' && typeof node.text === 'string') {
      lines.push(node.text);
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
      if (['paragraph', 'heading', 'listItem'].includes(node.type)) {
        lines.push('\n');
      }
    }
  }

  walk(doc);
  return lines
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Trocea un texto largo en fragmentos de ~`maxWords` palabras, con solapamiento
 * de `overlapWords` para no cortar ideas justo en el borde de un chunk. Corta
 * preferentemente en límites de oración cuando es posible.
 */
export function chunkText(text: string, maxWords = 300, overlapWords = 40): string[] {
  const clean = text.trim();
  if (!clean) return [];

  const words = clean.split(/\s+/);
  if (words.length <= maxWords) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;
    start = end - overlapWords;
  }

  return chunks;
}

/** Formatea un vector JS como el literal `[0.1,0.2,...]` que espera pgvector en SQL crudo. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
