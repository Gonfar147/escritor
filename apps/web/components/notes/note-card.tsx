'use client';

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Note } from '@/types/api';

export function NoteCard({
  note,
  selected,
  onToggleSelect,
  onOpen,
}: {
  note: Note;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <Card
      className={cn(
        'group relative cursor-pointer p-4 transition-colors hover:border-brass/40',
        selected && 'border-brass bg-brass/5',
      )}
      onClick={onOpen}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <input
          type="checkbox"
          checked={selected}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onToggleSelect(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brass"
          aria-label={note.title ? `Seleccionar ${note.title}` : 'Seleccionar nota'}
        />
        <div className="min-w-0 flex-1">
          {note.title && <h3 className="truncate font-display text-sm text-ink_text">{note.title}</h3>}
          <p className={cn('text-sm text-muted', note.title ? 'mt-1 line-clamp-3' : 'line-clamp-4')}>{note.content}</p>
        </div>
        {note.aiOriginProposalId && (
          <span title="Generada a partir de IA" className="shrink-0 text-brass-light">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={note.status} />
        {note.group && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-ink-800 px-2 py-0.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: note.group.color ?? '#8F7038' }} />
            {note.group.name}
          </span>
        )}
        {note.noteTags.slice(0, 3).map((nt) => (
          <span key={nt.tag.id} className="rounded-sm bg-ink-800 px-2 py-0.5 text-xs text-verdigris-light">
            #{nt.tag.name}
          </span>
        ))}
        {note.noteTags.length > 3 && (
          <span className="text-xs text-muted">+{note.noteTags.length - 3}</span>
        )}
        {note.relations.length > 0 && (
          <span className="text-xs text-muted">· {note.relations.length} relación{note.relations.length > 1 ? 'es' : ''}</span>
        )}
      </div>
    </Card>
  );
}
