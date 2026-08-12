import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-ink-800 text-muted',
  IN_PROGRESS: 'bg-brass/15 text-brass-light',
  REVISION: 'bg-verdigris/15 text-verdigris-light',
  REVIEW: 'bg-verdigris/15 text-verdigris-light',
  DONE: 'bg-verdigris/25 text-verdigris-light',
  COMPLETED: 'bg-verdigris/25 text-verdigris-light',
  PUBLISHED: 'bg-brass/25 text-brass-light',
  ARCHIVED: 'bg-ink-800 text-muted',
  IDEA: 'bg-ink-800 text-muted',
  PLANNING: 'bg-brass/10 text-brass-light',
  REVISED: 'bg-verdigris/15 text-verdigris-light',
  // Módulo 14 — Notas
  EXPLORING: 'bg-brass/10 text-brass-light',
  DEVELOPED: 'bg-verdigris/15 text-verdigris-light',
  INCORPORATED: 'bg-verdigris/25 text-verdigris-light',
  DISCARDED: 'bg-brick/15 text-brick-light',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_PROGRESS: 'En progreso',
  REVISION: 'Revisión',
  REVIEW: 'Revisión',
  DONE: 'Terminado',
  COMPLETED: 'Completado',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
  IDEA: '💭 Idea',
  PLANNING: 'Planificación',
  REVISED: 'Revisado',
  // Módulo 14 — Notas
  EXPLORING: '🔎 Explorando',
  DEVELOPED: '💡 Desarrollada',
  INCORPORATED: '📌 Incorporada',
  DISCARDED: '🗑️ Descartada',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium tracking-wide',
        statusStyles[status] ?? 'bg-ink-800 text-muted',
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
