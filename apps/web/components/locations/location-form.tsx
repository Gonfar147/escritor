'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Trash2, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { Location } from '@/types/api';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function LocationForm({
  location,
  onSaved,
  onDeleted,
}: {
  location: Location;
  onSaved: (l: Location) => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState(location);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setForm(location), [location]);

  function update<K extends keyof Location>(key: K, value: Location[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    setSaveState('idle');
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => save(next), 900);
  }

  async function save(next: Location) {
    setSaveState('saving');
    try {
      const updated = await api.patch<Location>(`/locations/${location.id}`, {
        name: next.name,
        history: next.history,
        geography: next.geography,
        climate: next.climate,
        notes: next.notes,
      });
      onSaved(updated);
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar "${form.name}"?`)) return;
    await api.delete(`/locations/${location.id}`);
    onDeleted();
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-800 text-muted">
            <MapPin className="h-6 w-6" strokeWidth={1.5} />
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
        <div>
          <Label>Historia</Label>
          <Textarea rows={3} value={form.history ?? ''} onChange={(e) => update('history', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Geografía</Label>
            <Textarea rows={3} value={form.geography ?? ''} onChange={(e) => update('geography', e.target.value)} />
          </div>
          <div>
            <Label>Clima</Label>
            <Textarea rows={3} value={form.climate ?? ''} onChange={(e) => update('climate', e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Notas</Label>
          <Textarea rows={3} value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
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
