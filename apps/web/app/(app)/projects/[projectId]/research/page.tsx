'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Search, FolderOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { ResearchItem, ResearchItemType } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ResearchCard } from '@/components/research/research-card';
import { ResearchItemDialog } from '@/components/research/research-item-dialog';

export default function ResearchPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResearchItem | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (tagFilter) params.set('tag', tagFilter);
    if (search) params.set('search', search);
    const [data, tagList] = await Promise.all([
      api.get<ResearchItem[]>(`/projects/${projectId}/research?${params.toString()}`),
      api.get<string[]>(`/projects/${projectId}/research/tags`),
    ]);
    setItems(data);
    setTags(tagList);
  }, [projectId, typeFilter, tagFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function saveItem(data: Partial<ResearchItem>) {
    if (editing) {
      await api.patch(`/research/${editing.id}`, data);
    } else {
      await api.post(`/projects/${projectId}/research`, data);
    }
    setEditing(null);
    load();
  }

  async function deleteItem() {
    if (!editing) return;
    if (!confirm(`¿Eliminar "${editing.title}"?`)) return;
    await api.delete(`/research/${editing.id}`);
    setEditing(null);
    setDialogOpen(false);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink_text">Investigación</h1>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4" /> Nuevo elemento
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="h-9 w-full rounded-md border border-ink-700 bg-ink-900 pl-8 pr-2 text-sm text-ink_text placeholder:text-muted focus-visible:border-brass focus-visible:outline-none"
          />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-40">
          <option value="">Todos los tipos</option>
          {(['PDF', 'WORD', 'EXCEL', 'AUDIO', 'VIDEO', 'IMAGE', 'LINK', 'NOTE', 'CLIPPING', 'OTHER'] as ResearchItemType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="w-40">
          <option value="">Todas las etiquetas</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-800 py-20 text-center text-muted">
          <FolderOpen className="mb-3 h-8 w-8" strokeWidth={1.5} />
          <p className="font-display text-lg text-ink_text">Sin resultados</p>
          <p className="mt-1 text-sm">Guardá PDFs, links, notas o recortes para tu investigación.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ResearchCard key={item.id} item={item} onClick={() => { setEditing(item); setDialogOpen(true); }} />
          ))}
        </div>
      )}

      <ResearchItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={saveItem}
        onDelete={editing ? deleteItem : undefined}
        projectId={projectId}
        initial={editing}
      />
    </div>
  );
}
