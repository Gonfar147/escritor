'use client';

import { useRef, useState } from 'react';
import { MapPin as PinIcon, X, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { MapAsset, MapPin, Location, Character } from '@/types/api';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function MapViewer({
  map,
  locations,
  characters,
  onPinsChanged,
}: {
  map: MapAsset & { pins: MapPin[] };
  locations: Location[];
  characters: Character[];
  onPinsChanged: () => void;
}) {
  const imgRef = useRef<HTMLDivElement>(null);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);
  const [activePin, setActivePin] = useState<MapPin | null>(null);

  function onImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setActivePin(null);
    setDraftPin({ x, y });
  }

  async function confirmPin(label: string, locationId?: string, characterId?: string) {
    if (!draftPin) return;
    await api.post(`/maps/${map.id}/pins`, {
      x: draftPin.x,
      y: draftPin.y,
      label: label || undefined,
      locationId: locationId || undefined,
      characterId: characterId || undefined,
    });
    setDraftPin(null);
    onPinsChanged();
  }

  async function deletePin(pinId: string) {
    await api.delete(`/pins/${pinId}`);
    setActivePin(null);
    onPinsChanged();
  }

  return (
    <div className="relative h-full overflow-auto bg-ink-950 p-6">
      <div
        ref={imgRef}
        onClick={onImageClick}
        className="relative mx-auto max-w-4xl cursor-crosshair overflow-hidden rounded-md border border-ink-800"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={map.imageUrl} alt={map.title} className="block w-full select-none" draggable={false} />

        {map.pins.map((pin) => (
          <button
            key={pin.id}
            onClick={(e) => {
              e.stopPropagation();
              setDraftPin(null);
              setActivePin(pin);
            }}
            style={{ left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }}
            className="absolute -translate-x-1/2 -translate-y-full text-brass drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-transform hover:scale-110"
          >
            <PinIcon className="h-6 w-6 fill-brass/30" strokeWidth={2} />
          </button>
        ))}

        {draftPin && (
          <div
            style={{ left: `${draftPin.x * 100}%`, top: `${draftPin.y * 100}%` }}
            className="absolute -translate-x-1/2 -translate-y-full text-brass-light"
          >
            <PinIcon className="h-6 w-6 animate-pulse" strokeWidth={2} />
          </div>
        )}
      </div>

      {draftPin && (
        <PinPopover onClose={() => setDraftPin(null)} onConfirm={confirmPin} locations={locations} characters={characters} />
      )}

      {activePin && (
        <PinDetail pin={activePin} onClose={() => setActivePin(null)} onDelete={() => deletePin(activePin.id)} />
      )}

      <p className="mt-4 text-center text-xs text-muted">Hacé click en cualquier punto del mapa para agregar un pin.</p>
    </div>
  );
}

function PinPopover({
  onClose,
  onConfirm,
  locations,
  characters,
}: {
  onClose: () => void;
  onConfirm: (label: string, locationId?: string, characterId?: string) => void;
  locations: Location[];
  characters: Character[];
}) {
  const [label, setLabel] = useState('');
  const [locationId, setLocationId] = useState('');
  const [characterId, setCharacterId] = useState('');

  return (
    <div className="fixed bottom-6 left-1/2 z-30 w-80 -translate-x-1/2 rounded-lg border border-ink-800 bg-ink-900 p-4 shadow-lg animate-slide-up">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-ink_text">Nuevo pin</span>
        <button onClick={onClose}><X className="h-4 w-4 text-muted hover:text-ink_text" /></button>
      </div>
      <div className="space-y-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Etiqueta (opcional)" />
        <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">Sin lugar vinculado</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
        <Select value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
          <option value="">Sin personaje vinculado</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Button size="sm" className="w-full" onClick={() => onConfirm(label, locationId, characterId)}>
          Agregar pin
        </Button>
      </div>
    </div>
  );
}

function PinDetail({ pin, onClose, onDelete }: { pin: MapPin; onClose: () => void; onDelete: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-30 w-72 -translate-x-1/2 rounded-lg border border-ink-800 bg-ink-900 p-4 shadow-lg animate-slide-up">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-ink_text">{pin.label || pin.location?.name || pin.character?.name || 'Pin'}</span>
        <div className="flex items-center gap-2">
          <button onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-muted hover:text-brick-light" /></button>
          <button onClick={onClose}><X className="h-4 w-4 text-muted hover:text-ink_text" /></button>
        </div>
      </div>
      {pin.location && <p className="text-xs text-muted">Lugar: {pin.location.name}</p>}
      {pin.character && <p className="text-xs text-muted">Personaje: {pin.character.name}</p>}
    </div>
  );
}
