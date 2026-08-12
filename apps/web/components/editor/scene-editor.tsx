'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import { Maximize2, Minimize2, Wifi, WifiOff, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/api';
import {
  buildDocumentName,
  getCollaborationWsUrl,
  colorForUserId,
  getLocalCollaboratorIdentity,
} from '@/lib/collaboration';
import { Scene } from '@/types/api';

type ConnectionState = 'connecting' | 'synced' | 'offline';

/** String exacto que manda el servidor Hocuspocus al autenticar (ver writeAuthenticated). */
const READONLY_SCOPE = 'readonly';

interface CollaboratorInfo {
  clientId: number;
  name?: string;
  color?: string;
}

export function SceneEditor({
  scene,
  projectId,
  onWordCountChange,
}: {
  scene: Scene;
  projectId: string;
  onWordCountChange?: (n: number) => void;
}) {
  const [focusMode, setFocusMode] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [readOnly, setReadOnly] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const identityRef = useRef<{ userId: string; label: string } | null>(null);

  // Un provider por escena. El componente se remonta con key={scene.id} en la
  // página padre, así que no hace falta reconstruirlo manualmente al cambiar de
  // escena — el ciclo de vida de React ya se encarga de cerrar/abrir la conexión.
  const provider = useMemo(() => {
    identityRef.current = getLocalCollaboratorIdentity(getAccessToken() ?? '');

    return new HocuspocusProvider({
      url: getCollaborationWsUrl(),
      name: buildDocumentName(projectId, scene.id),
      // Función (no string fijo): en cada intento de (re)conexión pide el token
      // vigente — así una reconexión después de que el access token de 15min
      // expiró usa el que haya refrescado mientras tanto `lib/api.ts`.
      token: () => getAccessToken() ?? '',
      onAuthenticationFailed: ({ reason }) => {
        // eslint-disable-next-line no-console
        console.error('Colaboración: fallo de autenticación —', reason);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id, projectId]);

  useEffect(() => {
    const onStatus = ({ status }: { status: WebSocketStatus }) => {
      if (status !== WebSocketStatus.Connected) setConnectionState('connecting');
    };
    const onSynced = ({ state }: { state: boolean }) => setConnectionState(state ? 'synced' : 'connecting');
    const onDisconnect = () => setConnectionState('offline');
    // El servidor decide en onAuthenticate si esta conexión queda de solo lectura
    // (usuario sin rol de escritura en el proyecto); acá solo se refleja.
    const onAuthenticated = () => setReadOnly(provider.authorizedScope === READONLY_SCOPE);

    provider.on('status', onStatus);
    provider.on('synced', onSynced);
    provider.on('disconnect', onDisconnect);
    provider.on('authenticated', onAuthenticated);

    return () => {
      provider.off('status', onStatus);
      provider.off('synced', onSynced);
      provider.off('disconnect', onDisconnect);
      provider.off('authenticated', onAuthenticated);
      provider.destroy();
    };
  }, [provider]);

  const localUser = useMemo(
    () => ({
      name: identityRef.current?.label ?? 'Autor/a',
      color: colorForUserId(identityRef.current?.userId ?? scene.id),
    }),
    [scene.id],
  );

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          // El undo/redo de Yjs (yUndoPlugin, vía la extensión Collaboration)
          // reemplaza al history local de StarterKit — tener los dos activos a
          // la vez hace que se pisen entradas del stack de undo entre sí.
          history: false,
        }),
        Placeholder.configure({ placeholder: 'Empezá a escribir esta escena…' }),
        CharacterCount,
        Collaboration.configure({ document: provider.document }),
        CollaborationCursor.configure({ provider, user: localUser }),
      ],
      editable: !readOnly,
      editorProps: {
        attributes: { class: 'prose-editor' },
      },
      // El contenido inicial lo aporta el propio Y.Doc (hidratado por el backend
      // desde Scene.content o desde ydocState) — no se pasa `content` acá para
      // no sembrar el documento dos veces.
      immediatelyRender: false,
    },
    [provider],
  );

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  // El contador de palabras ya no dispara un PATCH debounced (eso ahora lo hace
  // Hocuspocus del lado del servidor al persistir Scene.content) — se sigue
  // reportando hacia arriba solo para refrescar el árbol de estructura en vivo.
  useEffect(() => {
    if (!editor) return;
    const report = () => onWordCountChange?.(editor.storage.characterCount.words());
    editor.on('update', report);
    return () => {
      editor.off('update', report);
    };
  }, [editor, onWordCountChange]);

  useEffect(() => {
    function onAwarenessUpdate() {
      const states = provider.awareness?.getStates();
      if (!states) return;
      const list: CollaboratorInfo[] = [];
      states.forEach((state, clientId) => {
        if (clientId === provider.awareness?.clientID) return; // no listarse a uno mismo
        if (state?.user) list.push({ clientId, name: state.user.name, color: state.user.color });
      });
      setCollaborators(list);
    }
    provider.awareness?.on('update', onAwarenessUpdate);
    onAwarenessUpdate();
    return () => provider.awareness?.off('update', onAwarenessUpdate);
  }, [provider]);

  const wordCount = editor?.storage.characterCount.words() ?? scene.wordCount;
  const readMinutes = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className={cn('flex h-full flex-col', focusMode && 'fixed inset-0 z-40 bg-ink-950')}>
      <div className="flex items-center justify-between border-b border-ink-800 px-8 py-3">
        <h2 className="font-display text-lg text-ink_text">{scene.title}</h2>
        <div className="flex items-center gap-4 text-xs text-muted">
          <CollaboratorAvatars collaborators={collaborators} />
          <ConnectionIndicator state={connectionState} readOnly={readOnly} />
          <span className="font-mono">{wordCount} palabras</span>
          <span className="font-mono">{readMinutes} min de lectura</span>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="text-muted hover:text-ink_text"
            aria-label={focusMode ? 'Salir de modo foco' : 'Modo foco'}
          >
            {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-10">
        <div className={cn('mx-auto', focusMode ? 'max-w-2xl' : 'max-w-3xl')}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ConnectionIndicator({ state, readOnly }: { state: ConnectionState; readOnly: boolean }) {
  if (readOnly) {
    return (
      <span className="flex items-center gap-1" title="Tenés acceso de solo lectura a esta escena">
        <Lock className="h-3 w-3" /> Solo lectura
      </span>
    );
  }
  if (state === 'connecting') {
    return (
      <span className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Conectando…
      </span>
    );
  }
  if (state === 'offline') {
    return (
      <span
        className="flex items-center gap-1 text-brick-light"
        title="Sin conexión — tus cambios se guardan localmente y se sincronizan al reconectar"
      >
        <WifiOff className="h-3 w-3" /> Sin conexión
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-verdigris-light">
      <Wifi className="h-3 w-3" /> Sincronizado
    </span>
  );
}

function CollaboratorAvatars({ collaborators }: { collaborators: CollaboratorInfo[] }) {
  if (collaborators.length === 0) return null;
  return (
    <div className="flex items-center -space-x-2">
      {collaborators.slice(0, 4).map((c) => (
        <span
          key={c.clientId}
          title={c.name ?? 'Colaborador/a'}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink-950 text-[10px] font-medium text-ink-950"
          style={{ backgroundColor: c.color ?? '#8A8798' }}
        >
          {(c.name ?? '?').slice(0, 1).toUpperCase()}
        </span>
      ))}
      {collaborators.length > 4 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink-950 bg-ink-700 text-[10px] text-ink_text">
          +{collaborators.length - 4}
        </span>
      )}
    </div>
  );
}
