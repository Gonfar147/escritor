/**
 * Convención de nombre de documento colaborativo — debe coincidir EXACTAMENTE
 * con `buildDocumentName` del backend (apps/api/src/collaboration/document-name.util.ts).
 */
export function buildDocumentName(projectId: string, sceneId: string): string {
  return `project:${projectId}:scene:${sceneId}`;
}

/**
 * URL del servidor de colaboración (Hocuspocus), separada de `NEXT_PUBLIC_API_URL`
 * porque es un endpoint WebSocket embebido en el mismo backend, no una ruta REST
 * (no lleva el prefijo /api/v1). Ej: ws://localhost:4000/collaboration
 */
export function getCollaborationWsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_COLLAB_WS_URL;
  if (configured) return configured;

  // Fallback: derivar del API URL si no se configuró explícitamente.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const origin = apiUrl.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
  return `${wsProtocol}://${origin}/collaboration`;
}

/** Misma paleta "spine" (tailwind.config.ts) que usa el backend para asignar colores de presencia. */
const PRESENCE_COLORS = ['#B8944F', '#D3B678', '#3E7C74', '#5D9C93', '#B5533C', '#CC7962'];

export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
}

/**
 * Identidad local para el cursor de presencia (no es una fuente de autorización —
 * eso lo valida siempre el backend en `onAuthenticate` a partir del token). Se lee
 * del propio access token porque `useAuthStore().user` no se popula todavía en
 * ningún lado de la app (no hay un endpoint /auth/me implementado); en vez de
 * ampliar AuthModule para esto, se decodifica acá el payload del JWT (sub/email),
 * sin verificar firma — no hace falta, es solo para mostrar un nombre/color.
 */
export function getLocalCollaboratorIdentity(token: string): { userId: string; label: string } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId: string = payload.sub;
    const label: string = (payload.email as string | undefined)?.split('@')[0] ?? 'Autor/a';
    return { userId, label };
  } catch {
    return null;
  }
}
