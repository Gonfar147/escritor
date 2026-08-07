'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { TagInput } from '@/components/ui/tag-input';
import { ResearchItem, ResearchItemType } from '@/types/api';

const TYPE_LABELS: Record<ResearchItemType, string> = {
  PDF: 'PDF', WORD: 'Word', EXCEL: 'Excel', AUDIO: 'Audio', VIDEO: 'Video',
  IMAGE: 'Imagen', LINK: 'Link', NOTE: 'Nota', CLIPPING: 'Recorte', OTHER: 'Otro',
};

const FILE_TYPES: ResearchItemType[] = ['PDF', 'WORD', 'EXCEL', 'AUDIO', 'VIDEO', 'IMAGE', 'OTHER'];

export function ResearchItemDialog({
  open,
  onClose,
  onSave,
  onDelete,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ResearchItem>) => Promise<void>;
  onDelete?: () => Promise<void>;
  initial?: ResearchItem | null;
}) {
  const [form, setForm] = useState<Partial<ResearchItem>>({ type: 'NOTE', tags: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(initial ?? { type: 'NOTE', tags: [] });
  }, [initial, open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const type = form.type ?? 'NOTE';

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Editar elemento' : 'Nuevo elemento de investigación'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="ri-title">Título</Label>
          <Input id="ri-title" required autoFocus value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>

        <div>
          <Label>Tipo</Label>
          <Select value={type} onChange={(e) => setForm({ ...form, type: e.target.value as ResearchItemType })}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>

        {type === 'LINK' && (
          <div>
            <Label htmlFor="ri-link">URL</Label>
            <Input id="ri-link" type="url" required value={form.linkUrl ?? ''} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://…" />
          </div>
        )}

        {(type === 'NOTE' || type === 'CLIPPING') && (
          <div>
            <Label htmlFor="ri-content">{type === 'NOTE' ? 'Nota' : 'Texto recortado'}</Label>
            <Textarea id="ri-content" rows={5} required value={form.content ?? ''} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
        )}

        {FILE_TYPES.includes(type) && (
          <div>
            <Label htmlFor="ri-file">URL del archivo</Label>
            <Input id="ri-file" required value={form.fileUrl ?? ''} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://…" />
            <p className="mt-1 text-xs text-muted">
              Subida directa (S3) pendiente de conectar acá — el endpoint ya existe en el backend.
            </p>
          </div>
        )}

        <div>
          <Label>Etiquetas</Label>
          <TagInput value={form.tags ?? []} onChange={(v) => setForm({ ...form, tags: v })} placeholder="Agregar etiqueta…" />
        </div>

        <div className="flex justify-between gap-2 pt-2">
          {initial && onDelete ? (
            <Button type="button" variant="danger" size="sm" onClick={onDelete}>Eliminar</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
