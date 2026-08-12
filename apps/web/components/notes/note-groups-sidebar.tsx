'use client';

import { useState } from 'react';
import { Inbox, Plus, MoreHorizontal, Archive, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NoteGroup } from '@/types/api';

export function NoteGroupsSidebar({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onRenameGroup,
  onArchiveGroup,
  onDeleteGroup,
  totalCount,
  inboxCount,
}: {
  groups: NoteGroup[];
  selectedGroupId: string | null | 'unorganized';
  onSelectGroup: (id: string | null | 'unorganized') => void;
  onCreateGroup: (name: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onArchiveGroup: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  totalCount: number;
  inboxCount: number;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);

  function commitCreate() {
    const name = draft.trim();
    if (name) onCreateGroup(name);
    setDraft('');
    setCreating(false);
  }

  return (
    <div className="flex h-full flex-col border-r border-ink-800 bg-ink-900 py-3">
      <button
        onClick={() => onSelectGroup(null)}
        className={cn(
          'mx-2 flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
          selectedGroupId === null ? 'bg-brass/10 text-brass-light' : 'text-ink_text hover:bg-ink-800',
        )}
      >
        <span>Todas las notas</span>
        <span className="font-mono text-xs text-muted">{totalCount}</span>
      </button>

      <button
        onClick={() => onSelectGroup('unorganized')}
        className={cn(
          'mx-2 mt-1 flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
          selectedGroupId === 'unorganized' ? 'bg-brass/10 text-brass-light' : 'text-ink_text hover:bg-ink-800',
        )}
      >
        <span className="flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5" /> Bandeja
        </span>
        <span className="font-mono text-xs text-muted">{inboxCount}</span>
      </button>

      <div className="mt-5 flex items-center justify-between px-5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Grupos</span>
        <button onClick={() => setCreating(true)} aria-label="Nuevo grupo" className="text-muted hover:text-brass-light">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1 flex-1 overflow-y-auto px-2">
        {groups.map((g) => (
          <div key={g.id} className="group relative">
            <button
              onClick={() => onSelectGroup(g.id)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                selectedGroupId === g.id ? 'bg-brass/10 text-brass-light' : 'text-ink_text hover:bg-ink-800',
              )}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: g.color ?? '#8F7038' }}
                />
                <span className="truncate">{g.name}</span>
              </span>
              <span className="font-mono text-xs text-muted">{g._count?.notes ?? 0}</span>
            </button>
            <button
              onClick={() => setMenuFor(menuFor === g.id ? null : g.id)}
              aria-label={`Opciones de ${g.name}`}
              className="absolute right-8 top-1/2 hidden -translate-y-1/2 text-muted hover:text-ink_text group-hover:block"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuFor === g.id && (
              <div className="absolute right-2 top-9 z-10 w-40 rounded-md border border-ink-700 bg-ink-800 py-1 shadow-lg">
                <button
                  onClick={() => {
                    const name = window.prompt('Nuevo nombre del grupo', g.name);
                    if (name?.trim()) onRenameGroup(g.id, name.trim());
                    setMenuFor(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink_text hover:bg-ink-700"
                >
                  <Pencil className="h-3 w-3" /> Renombrar
                </button>
                <button
                  onClick={() => {
                    onArchiveGroup(g.id);
                    setMenuFor(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-ink_text hover:bg-ink-700"
                >
                  <Archive className="h-3 w-3" /> Archivar
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`¿Eliminar el grupo "${g.name}"? Las notas vuelven a la Bandeja.`)) {
                      onDeleteGroup(g.id);
                    }
                    setMenuFor(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-brick-light hover:bg-ink-700"
                >
                  <Trash2 className="h-3 w-3" /> Eliminar
                </button>
              </div>
            )}
          </div>
        ))}

        {creating && (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitCreate();
              if (e.key === 'Escape') {
                setDraft('');
                setCreating(false);
              }
            }}
            onBlur={commitCreate}
            placeholder="Nombre del grupo…"
            className="mx-1 mt-1 w-[calc(100%-0.5rem)] rounded-md border border-brass/40 bg-ink-800 px-3 py-2 text-sm text-ink_text placeholder:text-muted focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
