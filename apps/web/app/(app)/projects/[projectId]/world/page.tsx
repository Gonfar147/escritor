'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Globe2 } from 'lucide-react';
import { api } from '@/lib/api';
import { WorldEntry, WorldCategory } from '@/types/api';
import { EntityList } from '@/components/common/entity-list';
import { WorldEntryForm, CATEGORY_LABELS } from '@/components/world/world-entry-form';
import { CreateWorldEntryDialog } from '@/components/world/create-world-entry-dialog';
import { cn } from '@/lib/utils';

const CATEGORY_FILTERS: (WorldCategory | 'ALL')[] = ['ALL', ...(Object.keys(CATEGORY_LABELS) as WorldCategory[])];

export default function WorldBuildingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [entries, setEntries] = useState<WorldEntry[]>([]);
  const [filter, setFilter] = useState<WorldCategory | 'ALL'>('ALL');
  const [selected, setSelected] = useState<WorldEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const data = await api.get<WorldEntry[]>(`/projects/${projectId}/world-entries`);
    setEntries(data);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function selectEntry(id: string) {
    setSelected(await api.get<WorldEntry>(`/world-entries/${id}`));
  }

  async function createEntry(title: string, category: WorldCategory) {
    const created = await api.post<WorldEntry>(`/projects/${projectId}/world-entries`, { title, category });
    await load();
    selectEntry(created.id);
  }

  function onSaved(updated: WorldEntry) {
    setSelected(updated);
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? { ...e, title: updated.title, category: updated.category } : e)));
  }

  const filtered = filter === 'ALL' ? entries : entries.filter((e) => e.category === filter);

  return (
    <div className="grid h-full grid-cols-[280px_1fr]">
      <div className="flex h-full flex-col border-r border-ink-800">
        <div className="flex gap-1 overflow-x-auto border-b border-ink-800 bg-ink-900 px-2 py-2">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                'shrink-0 rounded-sm px-2 py-1 text-xs',
                filter === cat ? 'bg-brass/15 text-brass-light' : 'text-muted hover:text-ink_text',
              )}
            >
              {cat === 'ALL' ? 'Todo' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          <EntityList
            items={filtered.map((e) => ({ id: e.id, title: e.title, subtitle: CATEGORY_LABELS[e.category] }))}
            selectedId={selected?.id ?? null}
            onSelect={selectEntry}
            onCreate={() => setDialogOpen(true)}
            emptyLabel="Sin entradas en esta categoría"
            createLabel="Nueva entrada"
          />
        </div>
      </div>

      {selected ? (
        <WorldEntryForm
          entry={selected}
          allEntries={entries}
          onSaved={onSaved}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-muted">
          <Globe2 className="mb-3 h-8 w-8" strokeWidth={1.5} />
          <p className="font-display text-lg text-ink_text">La wiki de tu universo</p>
          <p className="mt-1 max-w-xs text-sm">Países, culturas, magia, criaturas — todo lo que sostiene tu historia.</p>
        </div>
      )}

      <CreateWorldEntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={createEntry}
        defaultCategory={filter === 'ALL' ? 'COUNTRY' : filter}
      />
    </div>
  );
}
