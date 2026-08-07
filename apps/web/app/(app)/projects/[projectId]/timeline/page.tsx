'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { History, Clock, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { TimelineEvent, TimelineInconsistency, Character, Location } from '@/types/api';
import { EntityList } from '@/components/common/entity-list';
import { CreateNamedDialog } from '@/components/common/create-named-dialog';
import { TimelineEventForm } from '@/components/timeline/timeline-event-form';
import { InconsistenciesBanner } from '@/components/timeline/inconsistencies-banner';
import { cn } from '@/lib/utils';

export default function TimelinePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [order, setOrder] = useState<'chronological' | 'narrative'>('chronological');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [inconsistencies, setInconsistencies] = useState<TimelineInconsistency[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<TimelineEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const [ev, inc, chars, locs] = await Promise.all([
      api.get<TimelineEvent[]>(`/projects/${projectId}/timeline/events?order=${order}`),
      api.get<TimelineInconsistency[]>(`/projects/${projectId}/timeline/inconsistencies`),
      api.get<Character[]>(`/projects/${projectId}/characters`),
      api.get<Location[]>(`/projects/${projectId}/locations`),
    ]);
    setEvents(ev);
    setInconsistencies(inc);
    setCharacters(chars);
    setLocations(locs);
  }, [projectId, order]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectEvent(id: string) {
    setSelected(await api.get<TimelineEvent>(`/timeline/events/${id}`));
  }

  async function createEvent(title: string) {
    const created = await api.post<TimelineEvent>(`/projects/${projectId}/timeline/events`, { title });
    await load();
    selectEvent(created.id);
  }

  return (
    <div className="grid h-full grid-cols-[320px_1fr]">
      <div className="flex h-full flex-col border-r border-ink-800">
        <div className="flex gap-1 border-b border-ink-800 bg-ink-900 p-2">
          <ToggleButton active={order === 'chronological'} onClick={() => setOrder('chronological')} icon={<Clock className="h-3.5 w-3.5" />}>
            Cronológico
          </ToggleButton>
          <ToggleButton active={order === 'narrative'} onClick={() => setOrder('narrative')} icon={<BookOpen className="h-3.5 w-3.5" />}>
            Narrativo
          </ToggleButton>
        </div>
        <div className="flex-1 overflow-hidden">
          <EntityList
            items={events.map((e, i) => ({
              id: e.id,
              title: e.title,
              subtitle: e.displayDate ?? undefined,
              badge: `#${i + 1}`,
            }))}
            selectedId={selected?.id ?? null}
            onSelect={selectEvent}
            onCreate={() => setDialogOpen(true)}
            emptyLabel="Sin eventos todavía"
            createLabel="Nuevo evento"
          />
        </div>
      </div>

      <div className="overflow-y-auto">
        <div className="px-8 pt-6">
          <InconsistenciesBanner items={inconsistencies} />
        </div>

        {selected ? (
          <TimelineEventForm
            event={selected}
            characters={characters}
            locations={locations}
            onSaved={load}
            onDeleted={() => {
              setSelected(null);
              load();
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted">
            <History className="mb-3 h-8 w-8" strokeWidth={1.5} />
            <p className="font-display text-lg text-ink_text">La cronología de tu historia</p>
            <p className="mt-1 max-w-xs text-sm">
              El orden "narrativo" se calcula solo, a partir de dónde enlaces cada evento con una escena.
            </p>
          </div>
        )}
      </div>

      <CreateNamedDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={createEvent}
        title="Nuevo evento"
        fieldLabel="Título"
        placeholder="Qué pasó"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-sm py-1.5 text-xs',
        active ? 'bg-brass/15 text-brass-light' : 'text-muted hover:text-ink_text',
      )}
    >
      {icon} {children}
    </button>
  );
}
