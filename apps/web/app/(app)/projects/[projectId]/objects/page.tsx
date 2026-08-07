'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Gem } from 'lucide-react';
import { api } from '@/lib/api';
import { StoryObject, Character, Location } from '@/types/api';
import { EntityList } from '@/components/common/entity-list';
import { CreateNamedDialog } from '@/components/common/create-named-dialog';
import { ObjectForm } from '@/components/objects/object-form';

export default function ObjectsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [objects, setObjects] = useState<StoryObject[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<StoryObject | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const [objs, chars, locs] = await Promise.all([
      api.get<StoryObject[]>(`/projects/${projectId}/objects`),
      api.get<Character[]>(`/projects/${projectId}/characters`),
      api.get<Location[]>(`/projects/${projectId}/locations`),
    ]);
    setObjects(objs);
    setCharacters(chars);
    setLocations(locs);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectObject(id: string) {
    setSelected(await api.get<StoryObject>(`/objects/${id}`));
  }

  async function createObject(name: string) {
    const created = await api.post<StoryObject>(`/projects/${projectId}/objects`, { name });
    await load();
    selectObject(created.id);
  }

  function onSaved(updated: StoryObject) {
    setSelected(updated);
    setObjects((prev) => prev.map((o) => (o.id === updated.id ? { ...o, name: updated.name } : o)));
  }

  return (
    <div className="grid h-full grid-cols-[280px_1fr]">
      <EntityList
        items={objects.map((o) => ({ id: o.id, title: o.name }))}
        selectedId={selected?.id ?? null}
        onSelect={selectObject}
        onCreate={() => setDialogOpen(true)}
        emptyLabel="Sin objetos todavía"
        createLabel="Nuevo objeto"
      />

      {selected ? (
        <ObjectForm
          object={selected}
          characters={characters}
          locations={locations}
          onSaved={onSaved}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-muted">
          <Gem className="mb-3 h-8 w-8" strokeWidth={1.5} />
          <p className="font-display text-lg text-ink_text">Elegí un objeto</p>
          <p className="mt-1 max-w-xs text-sm">O creá uno nuevo para tu inventario narrativo.</p>
        </div>
      )}

      <CreateNamedDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={createObject}
        title="Nuevo objeto"
        fieldLabel="Nombre"
        placeholder="Nombre del objeto"
      />
    </div>
  );
}
