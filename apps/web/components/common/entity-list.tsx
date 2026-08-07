'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EntityListItem {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  badge?: string;
}

export function EntityList({
  items,
  selectedId,
  onSelect,
  onCreate,
  emptyLabel,
  createLabel,
}: {
  items: EntityListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  emptyLabel: string;
  createLabel: string;
}) {
  const [query, setQuery] = useState('');
  const filtered = query
    ? items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div className="flex h-full flex-col border-r border-ink-800 bg-ink-900">
      <div className="border-b border-ink-800 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            className="h-8 w-full rounded-sm border border-ink-700 bg-ink-950 pl-8 pr-2 text-sm text-ink_text placeholder:text-muted focus-visible:border-brass focus-visible:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">{emptyLabel}</p>
        )}
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
              selectedId === item.id
                ? 'bg-brass/10 text-brass-light shadow-spine'
                : 'text-ink_text/85 hover:bg-ink-800',
            )}
            style={selectedId === item.id ? ({ '--tw-shadow-color': '#B8944F' } as React.CSSProperties) : undefined}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-800 text-[10px] text-muted">
                {item.title.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex-1 truncate">
              {item.title}
              {item.subtitle && <span className="ml-1.5 text-xs text-muted">{item.subtitle}</span>}
            </span>
            {item.badge && <span className="shrink-0 text-[10px] text-muted">{item.badge}</span>}
          </button>
        ))}
      </div>

      <button
        onClick={onCreate}
        className="flex items-center gap-1.5 border-t border-ink-800 px-4 py-3 text-sm text-muted hover:text-brass-light"
      >
        <Plus className="h-3.5 w-3.5" /> {createLabel}
      </button>
    </div>
  );
}
