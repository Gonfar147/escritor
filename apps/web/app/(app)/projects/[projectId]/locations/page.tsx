'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { Location } from '@/types/api';
import { EntityList } from '@/components/common/entity-list';
import { CreateNamedDialog } from '@/components/common/create-named-dialog';
import { LocationForm } from '@/components/locations/location-form';

export default function LocationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<Location | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const data = await api.get<Location[]>(`/projects/${projectId}/locations`);
    setLocations(data);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectLocation(id: string) {
    setSelected(await api.get<Location>(`/locations/${id}`));
  }

  async function createLocation(name: string) {
    const created = await api.post<Location>(`/projects/${projectId}/locations`, { name });
    await load();
    selectLocation(created.id);
  }

  function onSaved(updated: Location) {
    setSelected(updated);
    setLocations((prev) => prev.map((l) => (l.id === updated.id ? { ...l, name: updated.name } : l)));
  }

  return (
    <div className="grid h-full grid-cols-[280px_1fr]">
      <EntityList
        items={locations.map((l) => ({ id: l.id, title: l.name }))}
        selectedId={selected?.id ?? null}
        onSelect={selectLocation}
        onCreate={() => setDialogOpen(true)}
        emptyLabel="Sin lugares todavía"
        createLabel="Nuevo lugar"
      />

      {selected ? (
        <LocationForm
          location={selected}
          onSaved={onSaved}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-muted">
          <MapPin className="mb-3 h-8 w-8" strokeWidth={1.5} />
          <p className="font-display text-lg text-ink_text">Elegí un lugar</p>
          <p className="mt-1 max-w-xs text-sm">O creá uno nuevo para empezar a documentarlo.</p>
        </div>
      )}

      <CreateNamedDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={createLocation}
        title="Nuevo lugar"
        fieldLabel="Nombre"
        placeholder="Nombre del lugar"
      />
    </div>
  );
}
