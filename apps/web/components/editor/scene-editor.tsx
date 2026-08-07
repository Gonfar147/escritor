'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Maximize2, Minimize2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Scene } from '@/types/api';

type SaveState = 'idle' | 'saving' | 'saved';

export function SceneEditor({ scene, onWordCountChange }: { scene: Scene; onWordCountChange?: (n: number) => void }) {
  const [focusMode, setFocusMode] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Empezá a escribir esta escena…' }),
      CharacterCount,
    ],
    content: (scene.content as JSONContent) ?? undefined,
    editorProps: {
      attributes: { class: 'prose-editor' },
    },
    onUpdate: ({ editor }) => {
      setSaveState('idle');
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => save(editor.getJSON()), 1200);
    },
    // Evita el warning de hidratación de SSR — el documento se carga en el cliente
    immediatelyRender: false,
  });

  async function save(content: JSONContent) {
    setSaveState('saving');
    try {
      const updated = await api.patch<Scene>(`/scenes/${scene.id}`, { content });
      onWordCountChange?.(updated.wordCount);
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }

  // Recarga el documento cuando cambia de escena
  useEffect(() => {
    if (editor && scene) {
      editor.commands.setContent((scene.content as JSONContent) ?? { type: 'doc', content: [{ type: 'paragraph' }] });
      setSaveState('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id]);

  const wordCount = editor?.storage.characterCount.words() ?? scene.wordCount;
  const readMinutes = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className={cn('flex h-full flex-col', focusMode && 'fixed inset-0 z-40 bg-ink-950')}>
      <div className="flex items-center justify-between border-b border-ink-800 px-8 py-3">
        <h2 className="font-display text-lg text-ink_text">{scene.title}</h2>
        <div className="flex items-center gap-4 text-xs text-muted">
          <SaveIndicator state={saveState} />
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

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-verdigris-light">
        <Check className="h-3 w-3" /> Guardado
      </span>
    );
  }
  return null;
}
