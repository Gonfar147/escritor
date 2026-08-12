'use client';

import { useState } from 'react';
import { Brain, FolderInput, Link2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { EntityRelationPicker, EntityRelationValue } from './entity-relation-picker';
import { Note, NoteGroup } from '@/types/api';

export function NotesSelectionBar({
  selectedNotes,
  projectId,
  groups,
  onClear,
  onChanged,
  onThink,
}: {
  selectedNotes: Note[];
  projectId: string;
  groups: NoteGroup[];
  onClear: () => void;
  onChanged: () => void;
  onThink: () => void;
}) {
  const [organizing, setOrganizing] = useState(false);
  const [relateOpen, setRelateOpen] = useState(false);
  const [relateAdd, setRelateAdd] = useState<EntityRelationValue[]>([]);
  const [saving, setSaving] = useState(false);

  if (selectedNotes.length === 0) return null;

  async function moveAll(groupId: string) {
    await Promise.all(selectedNotes.map((n) => api.post(`/notes/${n.id}/move`, { groupId: groupId || null })));
    setOrganizing(false);
    onChanged();
  }

  async function relateAll() {
    if (relateAdd.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        selectedNotes.map((n) => {
          const existing = n.relations.map((r) => ({ entityType: r.entityType, entityId: r.entityId }));
          const merged = [...existing, ...relateAdd.filter((a) => !existing.some((e) => e.entityType === a.entityType && e.entityId === a.entityId))];
          return api.put(`/notes/${n.id}/relations`, { relations: merged });
        }),
      );
      setRelateOpen(false);
      setRelateAdd([]);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
        <div className="flex items-center gap-3 rounded-full border border-ink-700 bg-ink-800 px-5 py-2.5 shadow-xl">
          <span className="text-sm text-ink_text">
            {selectedNotes.length} nota{selectedNotes.length > 1 ? 's' : ''} seleccionada{selectedNotes.length > 1 ? 's' : ''}
          </span>
          <div className="h-4 w-px bg-ink-700" />

          {organizing ? (
            <Select autoFocus onChange={(e) => moveAll(e.target.value)} defaultValue="" className="h-8 w-40">
              <option value="" disabled>
                Mover a…
              </option>
              <option value="">📥 Bandeja</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          ) : (
            <button onClick={() => setOrganizing(true)} className="flex items-center gap-1.5 text-sm text-ink_text hover:text-brass-light">
              <FolderInput className="h-4 w-4" /> Organizar
            </button>
          )}

          <button onClick={() => setRelateOpen(true)} className="flex items-center gap-1.5 text-sm text-ink_text hover:text-brass-light">
            <Link2 className="h-4 w-4" /> Relacionar
          </button>

          <Button size="sm" onClick={onThink} className="ml-1">
            <Brain className="h-4 w-4" /> Pensar con estas notas
          </Button>

          <button onClick={onClear} aria-label="Deseleccionar todo" className="ml-1 text-muted hover:text-ink_text">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={relateOpen} onClose={() => setRelateOpen(false)} title="Relacionar notas seleccionadas" className="max-w-lg">
        <p className="mb-3 text-sm text-muted">
          Se agregará esta relación a las {selectedNotes.length} notas seleccionadas, sin borrar las relaciones que ya tengan.
        </p>
        <EntityRelationPicker projectId={projectId} value={relateAdd} onChange={setRelateAdd} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRelateOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={relateAll} disabled={relateAdd.length === 0 || saving}>
            {saving ? 'Guardando…' : 'Aplicar'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
