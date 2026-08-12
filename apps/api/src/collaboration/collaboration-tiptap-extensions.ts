import StarterKit from '@tiptap/starter-kit';

/**
 * El backend no renderiza nada — solo necesita el mismo *schema* de nodos/marks
 * que usa `scene-editor.tsx` en el frontend para poder convertir Y.Doc <-> JSON
 * Tiptap correctamente con `@hocuspocus/transformer`.
 *
 * `Placeholder` y `CharacterCount` (usadas en el frontend) son extensiones
 * puramente de UI/decoración: no agregan nodos ni marks al documento, así que
 * no afectan el schema y no hace falta espejarlas acá. Si en el futuro se agrega
 * al editor una extensión que sí agregue nodos/marks (tablas, imágenes, etc.),
 * hay que sumarla también acá o el transformer va a descartar ese contenido al
 * convertir.
 */
export const collaborationExtensions = [StarterKit];
