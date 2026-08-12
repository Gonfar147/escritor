'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { NoteRelationEntityType, Part } from '@/types/api';

const ENTITY_TYPE_LABELS: Record<NoteRelationEntityType, string> = {
  CHARACTER: 'Personaje',
  PART: 'Acto/Parte',
  SEQUENCE: 'Secuencia',
  CHAPTER: 'Capítulo',
  SCENE: 'Escena',
  LOCATION: 'Lugar',
  TIMELINE_EVENT: 'Acontecimiento',
};
const ENTITY_TYPES = Object.keys(ENTITY_TYPE_LABELS) as NoteRelationEntityType[];

interface Option {
  id: string;
  label: string;
  chapterId?: string; // solo para escenas, necesario para el fetch lazy
}

export interface EntityRelationValue {
  entityType: NoteRelationEntityType;
  entityId: string;
}

/** Carga perezosa y cacheada de las opciones de cada tipo de entidad del proyecto. */
function useEntityOptions(projectId: string) {
  const [cache, setCache] = useState<Partial<Record<NoteRelationEntityType, Option[]>>>({});
  const [parts, setParts] = useState<Part[] | null>(null);

  async function ensureParts(): Promise<Part[]> {
    if (parts) return parts;
    const data = await api.get<Part[]>(`/projects/${projectId}/parts`);
    setParts(data);
    return data;
  }

  async function load(type: NoteRelationEntityType): Promise<Option[]> {
    if (cache[type]) return cache[type]!;
    let options: Option[] = [];
    if (type === 'CHARACTER') {
      const data = await api.get<{ id: string; name: string }[]>(`/projects/${projectId}/characters`);
      options = data.map((c) => ({ id: c.id, label: c.name }));
    } else if (type === 'LOCATION') {
      const data = await api.get<{ id: string; name: string }[]>(`/projects/${projectId}/locations`);
      options = data.map((l) => ({ id: l.id, label: l.name }));
    } else if (type === 'TIMELINE_EVENT') {
      const data = await api.get<{ id: string; title: string }[]>(`/projects/${projectId}/timeline/events`);
      options = data.map((e) => ({ id: e.id, label: e.title }));
    } else if (type === 'PART') {
      const data = await ensureParts();
      options = data.map((p) => ({ id: p.id, label: p.title }));
    } else if (type === 'SEQUENCE') {
      const data = await ensureParts();
      options = data.flatMap((p) => (p.sequences ?? []).map((s) => ({ id: s.id, label: `${p.title} · ${s.title}` })));
    } else if (type === 'CHAPTER') {
      const data = await ensureParts();
      options = data.flatMap((p) => p.chapters.map((c) => ({ id: c.id, label: `${p.title} · ${c.title}` })));
    } else if (type === 'SCENE') {
      // Las escenas no vienen en el árbol de Partes — se cargan por capítulo bajo demanda.
      const data = await ensureParts();
      const chapters = data.flatMap((p) => p.chapters.map((c) => ({ ...c, partTitle: p.title })));
      const results = await Promise.all(
        chapters.map((c) =>
          api
            .get<{ id: string; title: string }[]>(`/chapters/${c.id}/scenes`)
            .then((scenes) => scenes.map((s) => ({ id: s.id, label: `${c.partTitle} · ${c.title} · ${s.title}`, chapterId: c.id })))
            .catch(() => [] as Option[]),
        ),
      );
      options = results.flat();
    }
    setCache((prev) => ({ ...prev, [type]: options }));
    return options;
  }

  return { load, cache };
}

export function EntityRelationPicker({
  projectId,
  value,
  onChange,
}: {
  projectId: string;
  value: EntityRelationValue[];
  onChange: (next: EntityRelationValue[]) => void;
}) {
  const { load, cache } = useEntityOptions(projectId);
  const [type, setType] = useState<NoteRelationEntityType>('CHARACTER');
  const [entityId, setEntityId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    load(type).finally(() => setLoading(false));
    setEntityId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const options = cache[type] ?? [];
  const labelFor = useMemo(() => {
    const all: Record<string, string> = {};
    Object.values(cache).forEach((list) => list?.forEach((o) => (all[o.id] = o.label)));
    return all;
  }, [cache]);

  function add() {
    if (!entityId) return;
    if (value.some((v) => v.entityType === type && v.entityId === entityId)) return;
    onChange([...value, { entityType: type, entityId }]);
    setEntityId('');
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span
              key={`${v.entityType}:${v.entityId}`}
              className="flex items-center gap-1.5 rounded-sm bg-ink-800 px-2 py-1 text-xs text-ink_text"
            >
              <span className="text-muted">{ENTITY_TYPE_LABELS[v.entityType]}:</span>
              {labelFor[v.entityId] ?? v.entityId}
              <button
                onClick={() => onChange(value.filter((x) => !(x.entityType === v.entityType && x.entityId === v.entityId)))}
                aria-label="Quitar relación"
              >
                <X className="h-3 w-3 text-muted hover:text-brick-light" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <Select value={type} onChange={(e) => setType(e.target.value as NoteRelationEntityType)} className="w-40">
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ENTITY_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select value={entityId} onChange={(e) => setEntityId(e.target.value)} className="flex-1" disabled={loading}>
          <option value="">{loading ? 'Cargando…' : options.length === 0 ? 'Nada para elegir todavía' : 'Elegir…'}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" size="md" onClick={add} disabled={!entityId} aria-label="Agregar relación">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
