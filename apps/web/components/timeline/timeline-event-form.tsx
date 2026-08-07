'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Trash2, Skull, X } from 'lucide-react';
import { api } from '@/lib/api';
import { TimelineEvent, TimelineEventType, Character, Location } from '@/types/api';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const TYPE_LABELS: Record<TimelineEventType, string> = {
  GENERIC: 'General', BIRTH: 'Nacimiento', DEATH: 'Muerte', BATTLE: 'Batalla',
  MEETING: 'Encuentro', TRAVEL: 'Viaje', DISCOVERY: 'Descubrimiento', OTHER: 'Otro',
};

export function TimelineEventForm({
  event,
  characters,
  locations,
  onSaved,
  onDeleted,
}: {
  event: TimelineEvent;
  characters: Character[];
  locations: Location[];
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState(event);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [addCharacterId, setAddCharacterId] = useState('');
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setForm(event), [event]);

  function update<K extends keyof TimelineEvent>(key: K, value: TimelineEvent[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    setSaveState('idle');
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => save(next), 900);
  }

  async function save(next: TimelineEvent) {
    setSaveState('saving');
    try {
      await api.patch(`/timeline/events/${event.id}`, {
        title: next.title,
        description: next.description,
        eventType: next.eventType,
        displayDate: next.displayDate,
        durationMinutes: next.durationMinutes,
        locationId: next.locationId || undefined,
      });
      setSaveState('saved');
      onSaved();
    } catch {
      setSaveState('idle');
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${form.title}"?`)) return;
    await api.delete(`/timeline/events/${event.id}`);
    onDeleted();
  }

  async function addCharacter() {
    if (!addCharacterId) return;
    await api.post(`/timeline/events/${event.id}/characters`, { characterId: addCharacterId });
    setAddCharacterId('');
    const refreshed = await api.get<TimelineEvent>(`/timeline/events/${event.id}`);
    setForm(refreshed);
    onSaved();
  }

  async function removeCharacter(characterId: string) {
    await api.delete(`/timeline/events/${event.id}/characters/${characterId}`);
    const refreshed = await api.get<TimelineEvent>(`/timeline/events/${event.id}`);
    setForm(refreshed);
    onSaved();
  }

  const availableCharacters = characters.filter((c) => !form.characters.some((ec) => ec.characterId === c.id));

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <Input
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
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
          <Label>Tipo</Label>
          <Select value={form.eventType} onChange={(e) => update('eventType', e.target.value as TimelineEventType)}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{v === 'DEATH' ? `💀 ${l}` : l}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Lugar</Label>
          <Select value={form.locationId ?? ''} onChange={(e) => update('locationId', e.target.value || null)}>
            <option value="">Sin lugar</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <Label>Fecha en el calendario ficticio</Label>
          <Input value={form.displayDate ?? ''} onChange={(e) => update('displayDate', e.target.value)} placeholder='Ej: "3ra Era, año 1042"' />
        </div>
        <div>
          <Label>Duración (minutos)</Label>
          <Input type="number" value={form.durationMinutes ?? ''} onChange={(e) => update('durationMinutes', e.target.value ? Number(e.target.value) : null)} />
        </div>
      </div>

      <div className="mt-4">
        <Label>Descripción</Label>
        <Textarea rows={4} value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} />
      </div>

      <div className="mt-6 border-t border-ink-800 pt-6">
        <Label>Personajes involucrados</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {form.characters.map((ec) => (
            <span key={ec.characterId} className="flex items-center gap-1.5 rounded-sm bg-ink-800 px-2 py-1 text-sm text-ink_text">
              {ec.character.name}
              {form.eventType === 'DEATH' && <Skull className="h-3 w-3 text-brick-light" />}
              <button onClick={() => removeCharacter(ec.characterId)} aria-label="Quitar">
                <X className="h-3 w-3 text-muted hover:text-brick-light" />
              </button>
            </span>
          ))}
        </div>
        {availableCharacters.length > 0 && (
          <div className="mt-3 flex gap-2">
            <Select value={addCharacterId} onChange={(e) => setAddCharacterId(e.target.value)} className="flex-1">
              <option value="">Agregar personaje…</option>
              {availableCharacters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Button type="button" variant="secondary" size="sm" onClick={addCharacter} disabled={!addCharacterId}>
              Agregar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'saving') return <span className="flex items-center gap-1 text-xs text-muted"><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</span>;
  if (state === 'saved') return <span className="flex items-center gap-1 text-xs text-verdigris-light"><Check className="h-3 w-3" /> Guardado</span>;
  return <span className="text-xs text-muted">&nbsp;</span>;
}
