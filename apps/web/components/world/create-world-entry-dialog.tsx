'use client';

import { useState, FormEvent } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { WorldCategory } from '@/types/api';
import { CATEGORY_LABELS } from './world-entry-form';

export function CreateWorldEntryDialog({
  open,
  onClose,
  onCreate,
  defaultCategory,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string, category: WorldCategory) => Promise<void>;
  defaultCategory: WorldCategory;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WorldCategory>(defaultCategory);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate(title, category);
      setTitle('');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nueva entrada">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="we-title">Título</Label>
          <Input id="we-title" required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Reino de Valdor" />
        </div>
        <div>
          <Label>Categoría</Label>
          <Select value={category} onChange={(e) => setCategory(e.target.value as WorldCategory)}>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading || !title}>{loading ? 'Creando…' : 'Crear'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
