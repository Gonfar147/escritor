/**
 * Convención de nombre de documento colaborativo: `project:{projectId}:scene:{sceneId}`.
 *
 * El `projectId` embebido en el nombre NUNCA se usa para autorizar nada — es solo
 * una ayuda de lectura/debug (ver nombre de sala en logs de Hocuspocus). La
 * autorización real siempre resuelve el projectId real desde la base de datos a
 * partir del sceneId (ver CollaborationService.onAuthenticate) y lo compara contra
 * este valor para detectar un nombre de documento manipulado o inconsistente.
 *
 * Los ids son cuid() (letras/números, sin ":" ni espacios), así que el patrón no
 * es ambiguo: dos escenas distintas no pueden terminar compartiendo accidentalmente
 * el mismo nombre de documento.
 */

const DOCUMENT_NAME_PATTERN = /^project:([a-zA-Z0-9_-]+):scene:([a-zA-Z0-9_-]+)$/;

export interface ParsedDocumentName {
  projectId: string;
  sceneId: string;
}

export function buildDocumentName(projectId: string, sceneId: string): string {
  return `project:${projectId}:scene:${sceneId}`;
}

/** Devuelve null si el nombre no matchea el formato esperado (nunca lanza). */
export function parseDocumentName(documentName: string): ParsedDocumentName | null {
  const match = DOCUMENT_NAME_PATTERN.exec(documentName);
  if (!match) return null;
  const [, projectId, sceneId] = match;
  return { projectId, sceneId };
}
