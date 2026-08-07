'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PenLine, Target, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import { Project, Part } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [parts, setParts] = useState<Part[]>([]);

  useEffect(() => {
    api.get<Project>(`/projects/${projectId}`).then(setProject);
    api.get<Part[]>(`/projects/${projectId}/parts`).then(setParts);
  }, [projectId]);

  if (!project) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-muted">Cargando…</div>;
  }

  const totalWords = parts.flatMap((p) => p.chapters).flatMap((c) => c.scenes).reduce((s, sc) => s + sc.wordCount, 0);
  const totalScenes = parts.flatMap((p) => p.chapters).flatMap((c) => c.scenes).length;
  const totalChapters = parts.flatMap((p) => p.chapters).length;
  const progress = project.wordGoal ? Math.min(100, Math.round((totalWords / project.wordGoal) * 100)) : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <StatusBadge status={project.status} />
            {project.genre && <span className="text-xs text-muted">{project.genre}</span>}
          </div>
          <h1 className="font-display text-3xl text-ink_text">{project.title}</h1>
          {project.subtitle && <p className="mt-1 text-muted">{project.subtitle}</p>}
        </div>
        <Link href={`/projects/${projectId}/editor`}>
          <Button>
            <PenLine className="h-4 w-4" /> Escribir
          </Button>
        </Link>
      </div>

      {project.synopsis && (
        <p className="mb-8 max-w-2xl text-ink_text/80 leading-relaxed">{project.synopsis}</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Palabras" value={totalWords.toLocaleString('es')} />
        <Stat label="Capítulos" value={totalChapters} />
        <Stat label="Escenas" value={totalScenes} />
        <Stat label="Partes" value={parts.length} />
      </div>

      {project.wordGoal && (
        <Card className="mt-6 p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-ink_text">
              <Target className="h-3.5 w-3.5 text-brass" /> Objetivo de palabras
            </span>
            <span className="font-mono text-muted">
              {totalWords.toLocaleString('es')} / {project.wordGoal.toLocaleString('es')}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-800">
            <div className="h-full rounded-full bg-brass transition-all" style={{ width: `${progress}%` }} />
          </div>
        </Card>
      )}

      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center gap-1.5 text-sm text-ink_text">
          <Layers className="h-3.5 w-3.5 text-brass" /> Estructura
        </div>
        {parts.length === 0 ? (
          <p className="text-sm text-muted">Todavía no armaste la estructura de este proyecto.</p>
        ) : (
          <ul className="space-y-1 text-sm text-ink_text/80">
            {parts.map((part) => (
              <li key={part.id}>
                {part.title} — {part.chapters.length} capítulo{part.chapters.length !== 1 && 's'}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="font-mono text-2xl text-ink_text">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </Card>
  );
}
