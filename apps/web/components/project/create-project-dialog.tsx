'use client';

import { useState, FormEvent } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { api } from '@/lib/api';
import { Project } from '@/types/api';

export function CreateProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const project = await api.post<Project>('/projects', { title, genre: genre || undefined, synopsis: synopsis || undefined });
      onCreated(project);
      setTitle('');
      setGenre('');
      setSynopsis('');
      onClose();
    } catch {
      setError('No se pudo crear el proyecto. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nuevo proyecto">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="El nombre de tu novela" autoFocus />
        </div>
        <div>
          <Label htmlFor="genre">Género</Label>
          <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Fantasía, thriller, romance…" />
        </div>
        <div>
          <Label htmlFor="synopsis">Sinopsis</Label>
          <textarea
            id="synopsis"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={3}
            placeholder="De qué trata (podés dejarlo para después)"
            className="w-full rounded-md border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink_text placeholder:text-muted focus-visible:border-brass focus-visible:outline-none"
          />
        </div>

        {error && <p className="text-sm text-brick-light">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || !title}>
            {loading ? 'Creando…' : 'Crear proyecto'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
