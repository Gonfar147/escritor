/**
 * Cuenta palabras recorriendo recursivamente un documento Tiptap/ProseMirror en JSON.
 * Funciona con cualquier estructura de nodos (párrafos, listas, tablas, etc.)
 * porque solo mira los nodos de tipo "text".
 */
export function countWordsInTiptapDoc(doc: unknown): number {
  let text = '';

  function walk(node: any) {
    if (!node) return;
    if (node.type === 'text' && typeof node.text === 'string') {
      text += node.text + ' ';
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  }

  walk(doc);

  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}
