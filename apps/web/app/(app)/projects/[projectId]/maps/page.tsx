'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MapIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { MapAsset, MapPin, Location, Character, MapType } from '@/types/api';
import { EntityList } from '@/components/common/entity-list';
import { CreateMapDialog } from '@/components/maps/create-map-dialog';
import { MapViewer } from '@/components/maps/map-viewer';

export default function MapsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [maps, setMaps] = useState<MapAsset[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<(MapAsset & { pins: MapPin[] }) | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const [m, l, c] = await Promise.all([
      api.get<MapAsset[]>(`/projects/${projectId}/maps`),
      api.get<Location[]>(`/projects/${projectId}/locations`),
      api.get<Character[]>(`/projects/${projectId}/characters`),
    ]);
    setMaps(m);
    setLocations(l);
    setCharacters(c);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectMap(id: string) {
    setSelected(await api.get<MapAsset & { pins: MapPin[] }>(`/maps/${id}`));
  }

  async function createMap(data: { title: string; mapType: MapType; imageUrl: string }) {
    const created = await api.post<MapAsset>(`/projects/${projectId}/maps`, data);
    await load();
    selectMap(created.id);
  }

  async function refreshSelected() {
    if (selected) setSelected(await api.get<MapAsset & { pins: MapPin[] }>(`/maps/${selected.id}`));
  }

  return (
    <div className="grid h-full grid-cols-[280px_1fr]">
      <EntityList
        items={maps.map((m) => ({ id: m.id, title: m.title }))}
        selectedId={selected?.id ?? null}
        onSelect={selectMap}
        onCreate={() => setDialogOpen(true)}
        emptyLabel="Sin mapas todavía"
        createLabel="Nuevo mapa"
      />

      {selected ? (
        <MapViewer map={selected} locations={locations} characters={characters} onPinsChanged={refreshSelected} />
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-muted">
          <MapIcon className="mb-3 h-8 w-8" strokeWidth={1.5} />
          <p className="font-display text-lg text-ink_text">Elegí un mapa</p>
          <p className="mt-1 max-w-xs text-sm">O subí uno nuevo para empezar a ubicar tu mundo.</p>
        </div>
      )}

      <CreateMapDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreate={createMap} />
    </div>
  );
}
