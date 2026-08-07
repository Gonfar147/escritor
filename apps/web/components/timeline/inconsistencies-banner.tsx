import { AlertTriangle } from 'lucide-react';
import { TimelineInconsistency } from '@/types/api';

export function InconsistenciesBanner({ items }: { items: TimelineInconsistency[] }) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4 rounded-md border border-brick/30 bg-brick/10 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-brick-light">
        <AlertTriangle className="h-4 w-4" />
        {items.length} inconsistencia{items.length !== 1 && 's'} detectada{items.length !== 1 && 's'}
      </div>
      <ul className="space-y-0.5 pl-6 text-sm text-ink_text/80">
        {items.map((w, i) => (
          <li key={i} className="list-disc">{w.message}</li>
        ))}
      </ul>
    </div>
  );
}
