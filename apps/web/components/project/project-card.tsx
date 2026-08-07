import Link from 'next/link';
import { BookText } from 'lucide-react';
import { Project } from '@/types/api';
import { StatusBadge } from '@/components/ui/badge';

// Rotación de colores de "lomo" cuando el proyecto no definió uno propio —
// como libros distintos en el mismo estante.
const SPINE_FALLBACKS = ['#B8944F', '#3E7C74', '#B5533C', '#7A6FB0'];

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const spineColor = project.color ?? SPINE_FALLBACKS[index % SPINE_FALLBACKS.length];

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-ink-800 bg-ink-900 pl-4 transition-transform duration-150 hover:-translate-y-0.5"
      style={{ boxShadow: `inset 3px 0 0 0 ${spineColor}` }}
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <BookText className="h-4 w-4 text-muted" strokeWidth={1.5} />
          <StatusBadge status={project.status} />
        </div>

        <h3 className="font-display text-lg leading-snug text-ink_text group-hover:text-brass-light">
          {project.title}
        </h3>
        {project.subtitle && <p className="mt-1 text-sm text-muted">{project.subtitle}</p>}

        {project.synopsis && (
          <p className="mt-3 line-clamp-2 text-sm text-ink_text/70">{project.synopsis}</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted">
          <span>{project.genre ?? 'Sin género'}</span>
          <span className="font-mono">
            {new Date(project.updatedAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
          </span>
        </div>
      </div>
    </Link>
  );
}
