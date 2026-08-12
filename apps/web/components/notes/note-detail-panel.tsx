'use client';

import { useEffect, useState } from 'react';
import { X, Trash2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { TagInput } from '@/components/ui/tag-input';
import { EntityRelationPicker, EntityRelationValue } from './entity-relation-picker';
import { Note, NoteGroup, NoteStatus } from '@/types/api';

const STATUS_OPTIONS: { value: NoteStatus; label: string }[] = [
  { value: 'IDEA', label: '💭 Idea' },
  { value: 'EXPLORING', label: '🔎 Explorando' },
  { value: 'DEVELOPED', label: '💡 Desarrollada' },
  { value: 'INCORPORATED', label: '📌 Incorporada' },
  { value: 'DISCARDED', label: '🗑️ Descartada' },
];

export function NoteDetailPanel({
  note,
  projectId,
  groups,
  onClose,
  onUpdated,
  onDeleted,
}: {
  note: Note;
  projectId: string;
  groups: NoteGroup[];
  onClose: () => void;
  onUpdated: (note: Note) => void;
  onDeleted: (noteId: string) => void;
}) {
  const [title, setTitle] = useState(note.title ?? '');
  const [content, setContent] = useState(note.content);

  useEffect(() => {
    setTitle(note.title ?? '');
    setContent(note.content);
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveTitleContent() {
    if (title === (note.title ?? '') && content === note.content) return;
    const updated = await api.put<Note>(`/notes/${note.id}`, { title: title || undefined, content });
    onUpdated(updated);
  }

  async function saveStatus(status: NoteStatus) {
    const updated = await api.put<Note>(`/notes/${note.id}`, { status });
    onUpdated(updated);
  }

  async function saveGroup(groupId: string) {
    const updated = await api.post<Note>(`/notes/${note.id}/move`, { groupId: groupId || null });
    onUpdated(updated);
  }

  async function saveTags(tags: string[]) {
    const updated = await api.put<Note>(`/notes/${note.id}/tags`, { tags });
    onUpdated(updated);
  }

  async function saveRelations(relations: EntityRelationValue[]) {
    const updated = await api.put<Note>(`/notes/${note.id}/relations`, { relations });
    onUpdated(updated);
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;
    await api.delete(`/notes/${note.id}`);
    onDeleted(note.id);
  }

  return (
    <aside className="flex h-full w-[420px] shrink-0 flex-col border-l border-ink-800 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-800 px-5 py-3">
        <span className="text-xs uppercase tracking-wide text-muted">Nota</span>
        <div className="flex items-center gap-3">
          <button onClick={handleDelete} aria-label="Eliminar nota" className="text-muted hover:text-brick-light">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} aria-label="Cerrar panel" className="text-muted hover:text-ink_text">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {note.aiOriginProposalId && (
          <div className="flex items-center gap-1.5 rounded-md bg-brass/10 px-3 py-2 text-xs text-brass-light">
            <Sparkles className="h-3.5 w-3.5" /> Generada a partir de IA
            {note.aiSourceNoteIds.length > 0 && ` · ${note.aiSourceNoteIds.length} nota(s) de origen`}
          </div>
        )}

        <div>
          <Label htmlFor="note-title">Título (opcional)</Label>
          <Input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitleContent}
            placeholder="Sin título"
          />
        </div>

        <div>
          <Label htmlFor="note-content">Contenido</Label>
          <Textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={saveTitleContent}
            rows={8}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Estado</Label>
            <Select value={note.status} onChange={(e) => saveStatus(e.target.value as NoteStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Grupo</Label>
            <Select value={note.groupId ?? ''} onChange={(e) => saveGroup(e.target.value)}>
              <option value="">📥 Bandeja</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>Tags</Label>
          <TagInput
            value={note.noteTags.map((nt) => nt.tag.name)}
            onChange={saveTags}
            placeholder="Agregar tag…"
          />
        </div>

        <div>
          <Label>Relacionada con</Label>
          <EntityRelationPicker
            projectId={projectId}
            value={note.relations.map((r) => ({ entityType: r.entityType, entityId: r.entityId }))}
            onChange={saveRelations}
          />
        </div>

        <div className="border-t border-ink-800 pt-4 text-xs text-muted">
          <p>Creada: {new Date(note.createdAt).toLocaleString('es-AR')}</p>
          <p>Modificada: {new Date(note.updatedAt).toLocaleString('es-AR')}</p>
        </div>
      </div>
    </aside>
  );
}
