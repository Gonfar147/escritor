'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Character } from '@/types/api';
import { EntityList } from '@/components/common/entity-list';
import { CreateNamedDialog } from '@/components/common/create-named-dialog';
import { CharacterForm } from '@/components/characters/character-form';

export default function CharactersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<Character | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const data = await api.get<Character[]>(`/projects/${projectId}/characters`);
    setCharacters(data);
    return data;
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectCharacter(id: string) {
    const full = await api.get<Character>(`/characters/${id}`);
    setSelected(full);
  }

  async function createCharacter(name: string) {
    const created = await api.post<Character>(`/projects/${projectId}/characters`, { name });
    await load();
    selectCharacter(created.id);
  }

  function onSaved(updated: Character) {
    setSelected(updated);
    setCharacters((prev) => prev.map((c) => (c.id === updated.id ? { ...c, name: updated.name, photoUrl: updated.photoUrl } : c)));
  }

  function onDeleted() {
    setSelected(null);
    load();
  }

  return (
    <div className="grid h-full grid-cols-[280px_1fr]">
      <EntityList
        items={characters.map((c) => ({ id: c.id, title: c.name, imageUrl: c.photoUrl }))}
        selectedId={selected?.id ?? null}
        onSelect={selectCharacter}
        onCreate={() => setDialogOpen(true)}
        emptyLabel="Sin personajes todavía"
        createLabel="Nuevo personaje"
      />

      {selected ? (
        <CharacterForm character={selected} onSaved={onSaved} onDeleted={onDeleted} />
      ) : (
        <EmptyState />
      )}

      <CreateNamedDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={createCharacter}
        title="Nuevo personaje"
        fieldLabel="Nombre"
        placeholder="Nombre del personaje"
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center text-muted">
      <Users className="mb-3 h-8 w-8" strokeWidth={1.5} />
      <p className="font-display text-lg text-ink_text">Elegí un personaje</p>
      <p className="mt-1 max-w-xs text-sm">O creá uno nuevo para empezar a construir su ficha.</p>
    </div>
  );
}
