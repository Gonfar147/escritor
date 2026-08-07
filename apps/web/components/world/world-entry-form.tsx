'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Check, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { WorldEntry, WorldCategory } from '@/types/api';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { TagInput } from '@/components/ui/tag-input';
import { Button } from '@/components/ui/button';

export const CATEGORY_LABELS: Record<WorldCategory, string> = {
  COUNTRY: 'País', CITY: 'Ciudad', CULTURE: 'Cultura', ECONOMY: 'Economía',
  RELIGION: 'Religión', HISTORY_EVENT: 'Historia', RACE: 'Raza', CREATURE: 'Criatura',
  LANGUAGE: 'Idioma', POLITICS: 'Política', TECHNOLOGY: 'Tecnología', MAGIC_SYSTEM: 'Magia',
  CALENDAR: 'Calendario', CURRENCY: 'Moneda', LAW: 'Ley', ORGANIZATION: 'Organización', OTHER: 'Otro',
};

export function WorldEntryForm({
  entry,
  allEntries,
  onSaved,
  onDeleted,
}: {
  entry: WorldEntry;
  allEntries: WorldEntry[];
  onSaved: (e: WorldEntry) => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState(entry);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Escribí el artículo…' })],
    content: (entry.content as JSONContent) ?? undefined,
    onUpdate: ({ editor }) => scheduleSave({ ...form, content: editor.getJSON() }),
    immediatelyRender: false,
  });

  useEffect(() => {
    setForm(entry);
    editor?.commands.setContent((entry.content as JSONContent) ?? { type: 'doc', content: [{ type: 'paragraph' }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id]);

  function scheduleSave(next: WorldEntry) {
    setForm(next);
    setSaveState('idle');
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => save(next), 900);
  }

  async function save(next: WorldEntry) {
    setSaveState('saving');
    try {
      const updated = await api.patch<WorldEntry>(`/world-entries/${entry.id}`, {
        title: next.title,
        category: next.category,
        summary: next.summary,
        content: next.content,
        tags: next.tags,
        parentId: next.parentId || undefined,
      });
      onSaved(updated);
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${form.title}"?`)) return;
    await api.delete(`/world-entries/${entry.id}`);
    onDeleted();
  }

  const possibleParents = allEntries.filter((e) => e.id !== entry.id);

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <Input
          value={form.title}
          onChange={(e) => scheduleSave({ ...form, title: e.target.value })}
          className="border-none bg-transparent p-0 font-display text-2xl text-ink_text focus-visible:outline-none"
          style={{ height: 'auto' }}
        />
        <Button variant="ghost" size="sm" onClick={remove}>
          <Trash2 className="h-3.5 w-3.5 text-muted hover:text-brick-light" />
        </Button>
      </div>
      <SaveIndicator state={saveState} />

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <Label>Categoría</Label>
          <Select value={form.category} onChange={(e) => scheduleSave({ ...form, category: e.target.value as WorldCategory })}>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Pertenece a</Label>
          <Select value={form.parentId ?? ''} onChange={(e) => scheduleSave({ ...form, parentId: e.target.value || null })}>
            <option value="">— Ninguno —</option>
            {possibleParents.map((p) => (
              <option key={p.id} value={p.id}>{CATEGORY_LABELS[p.category]}: {p.title}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4">
        <Label>Resumen</Label>
        <Textarea rows={2} value={form.summary ?? ''} onChange={(e) => scheduleSave({ ...form, summary: e.target.value })} />
      </div>

      <div className="mt-4">
        <Label>Etiquetas</Label>
        <TagInput value={form.tags} onChange={(v) => scheduleSave({ ...form, tags: v })} placeholder="Agregar etiqueta…" />
      </div>

      <div className="mt-6 border-t border-ink-800 pt-6">
        <Label>Artículo</Label>
        <div className="mt-2 min-h-[240px] rounded-md border border-ink-700 bg-ink-900 px-4 py-3">
          <EditorContent editor={editor} className="font-display text-base leading-relaxed text-ink_text [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none" />
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'saving') return <span className="flex items-center gap-1 text-xs text-muted"><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</span>;
  if (state === 'saved') return <span className="flex items-center gap-1 text-xs text-verdigris-light"><Check className="h-3 w-3" /> Guardado</span>;
  return <span className="text-xs text-muted">&nbsp;</span>;
}
