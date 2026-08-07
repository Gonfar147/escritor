'use client';

import { useState, FormEvent } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { MapType } from '@/types/api';

const TYPE_LABELS: Record<MapType, string> = {
  WORLD: 'Mundo', REGION: 'Región', CITY: 'Ciudad', BUILDING: 'Edificio', OTHER: 'Otro',
};

export function CreateMapDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; mapType: MapType; imageUrl: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [mapType, setMapType] = useState<MapType>('WORLD');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({ title, mapType, imageUrl });
      setTitle('');
      setImageUrl('');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nuevo mapa">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="map-title">Título</Label>
          <Input id="map-title" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Continente de Valdor" />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={mapType} onChange={(e) => setMapType(e.target.value as MapType)}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="map-image">URL de la imagen</Label>
          <Input id="map-image" required type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          <p className="mt-1 text-xs text-muted">
            Por ahora pegá una URL directa. La subida de archivos (S3) ya existe en el backend, falta conectarla acá.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading || !title || !imageUrl}>{loading ? 'Creando…' : 'Crear'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
