'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Trash2, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import { StoryObject, Character, Location } from '@/types/api';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function ObjectForm({
  object,
  characters,
  locations,
  onSaved,
  onDeleted,
}: {
  object: StoryObject;
  characters: Character[];
  locations: Location[];
  onSaved: (o: StoryObject) => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState(object);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setForm(object), [object]);

  function update<K extends keyof StoryObject>(key: K, value: StoryObject[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    setSaveState('idle');
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => save(next), 900);
  }

  async function save(next: StoryObject) {
    setSaveState('saving');
    try {
      const updated = await api.patch<StoryObject>(`/objects/${object.id}`, {
        name: next.name,
        description: next.description,
        history: next.history,
        importance: next.importance,
        ownerCharacterId: next.ownerCharacterId || undefined,
        locationId: next.locationId || undefined,
      });
      onSaved(updated);
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${form.name}"?`)) return;
    await api.delete(`/objects/${object.id}`);
    onDeleted();
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-800 text-muted">
            <Gem className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="border-none bg-transparent p-0 font-display text-2xl text-ink_text focus-visible:outline-none"
              style={{ height: 'auto' }}
            />
            <SaveIndicator state={saveState} />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={remove}>
          <Trash2 className="h-3.5 w-3.5 text-muted hover:text-brick-light" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Dueño</Label>
            <Select value={form.ownerCharacterId ?? ''} onChange={(e) => update('ownerCharacterId', e.target.value || null)}>
              <option value="">Sin dueño</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Ubicación</Label>
            <Select value={form.locationId ?? ''} onChange={(e) => update('locationId', e.target.value || null)}>
              <option value="">Sin ubicación</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Descripción</Label>
          <Textarea rows={3} value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div>
          <Label>Historia</Label>
          <Textarea rows={3} value={form.history ?? ''} onChange={(e) => update('history', e.target.value)} />
        </div>
        <div>
          <Label>Importancia narrativa</Label>
          <Textarea rows={2} value={form.importance ?? ''} onChange={(e) => update('importance', e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'saving') return <span className="flex items-center gap-1 text-xs text-muted"><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</span>;
  if (state === 'saved') return <span className="flex items-center gap-1 text-xs text-verdigris-light"><Check className="h-3 w-3" /> Guardado</span>;
  return <span className="text-xs text-muted">&nbsp;</span>;
}
