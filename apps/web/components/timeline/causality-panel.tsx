'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowRight, X, Link2 } from 'lucide-react';
import { api } from '@/lib/api';
import { EventCausality, TimelineEvent } from '@/types/api';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/input';

/**
 * Causalidad entre acontecimientos (punto 17 de Arquitectura): reusa TimelineEvent
 * y vive acá, en la ficha del evento, en vez de en una pantalla aparte — la línea
 * temporal sigue siendo la única fuente de verdad de los acontecimientos.
 */
export function CausalityPanel({ eventId }: { eventId: string }) {
  const { projectId } = useParams<{ projectId: string }>();
  const [allLinks, setAllLinks] = useState<EventCausality[]>([]);
  const [allEvents, setAllEvents] = useState<TimelineEvent[]>([]);
  const [newCauseTarget, setNewCauseTarget] = useState('');
  const [newEffectTarget, setNewEffectTarget] = useState('');

  async function load() {
    const [links, events] = await Promise.all([
      api.get<EventCausality[]>(`/projects/${projectId}/architecture/causality`),
      api.get<TimelineEvent[]>(`/projects/${projectId}/timeline/events`),
    ]);
    setAllLinks(links);
    setAllEvents(events);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, eventId]);

  const causes = allLinks.filter((l) => l.toEventId === eventId); // lo que PROVOCA este evento
  const effects = allLinks.filter((l) => l.fromEventId === eventId); // lo que ESTE evento provoca

  const otherEvents = allEvents.filter((e) => e.id !== eventId);

  async function addCause() {
    if (!newCauseTarget) return;
    await api.post('/architecture/causality', { fromEventId: newCauseTarget, toEventId: eventId });
    setNewCauseTarget('');
    load();
  }

  async function addEffect() {
    if (!newEffectTarget) return;
    await api.post('/architecture/causality', { fromEventId: eventId, toEventId: newEffectTarget });
    setNewEffectTarget('');
    load();
  }

  async function removeLink(id: string) {
    await api.delete(`/architecture/causality/${id}`);
    load();
  }

  return (
    <div className="mt-6 border-t border-ink-800 pt-6">
      <div className="mb-3 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-brass" strokeWidth={1.5} />
        <Label>Causalidad</Label>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs text-muted">Este evento fue provocado por:</p>
          <div className="flex flex-wrap gap-1.5">
            {causes.map((l) => (
              <span key={l.id} className="flex items-center gap-1.5 rounded-sm bg-ink-800 px-2 py-1 text-xs text-ink_text">
                {l.fromEvent.title}
                <button onClick={() => removeLink(l.id)}><X className="h-3 w-3 text-muted hover:text-brick-light" /></button>
              </span>
            ))}
            {causes.length === 0 && <span className="text-xs text-muted">Ninguno todavía</span>}
          </div>
          <div className="mt-2 flex gap-2">
            <Select value={newCauseTarget} onChange={(e) => setNewCauseTarget(e.target.value)} className="flex-1">
              <option value="">Agregar causa…</option>
              {otherEvents.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
            <button onClick={addCause} disabled={!newCauseTarget} className="rounded-md border border-ink-700 px-2 text-xs text-muted hover:text-ink_text disabled:opacity-40">
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-muted">Este evento provoca:</p>
          <div className="flex flex-wrap gap-1.5">
            {effects.map((l) => (
              <span key={l.id} className="flex items-center gap-1.5 rounded-sm bg-ink-800 px-2 py-1 text-xs text-ink_text">
                {l.toEvent.title}
                <button onClick={() => removeLink(l.id)}><X className="h-3 w-3 text-muted hover:text-brick-light" /></button>
              </span>
            ))}
            {effects.length === 0 && <span className="text-xs text-muted">Ninguno todavía</span>}
          </div>
          <div className="mt-2 flex gap-2">
            <Select value={newEffectTarget} onChange={(e) => setNewEffectTarget(e.target.value)} className="flex-1">
              <option value="">Agregar consecuencia…</option>
              {otherEvents.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
            <button onClick={addEffect} disabled={!newEffectTarget} className="rounded-md border border-ink-700 px-2 text-xs text-muted hover:text-ink_text disabled:opacity-40">
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
