'use client';

import { useEffect, useState } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { Project } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/project/project-card';
import { CreateProjectDialog } from '@/components/project/create-project-dialog';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    api.get<Project[]>('/projects').then(setProjects).catch(() => setProjects([]));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink_text">Tus proyectos</h1>
          <p className="mt-1 text-sm text-muted">Cada libro, con su propio estante.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo proyecto
        </Button>
      </div>

      {projects === null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-lg border border-ink-800 bg-ink-900" />
          ))}
        </div>
      )}

      {projects?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-800 py-20 text-center">
          <BookOpen className="mb-3 h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="font-display text-lg text-ink_text">Todavía no hay nada acá</p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Creá tu primer proyecto y empezá a darle forma a tu historia.
          </p>
          <Button className="mt-5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Crear el primero
          </Button>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(p) => setProjects((prev) => [p, ...(prev ?? [])])}
      />
    </div>
  );
}
