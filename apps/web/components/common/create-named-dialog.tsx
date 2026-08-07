'use client';

import { useState, FormEvent } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export function CreateNamedDialog({
  open,
  onClose,
  onCreate,
  title,
  fieldLabel,
  placeholder,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  title: string;
  fieldLabel: string;
  placeholder: string;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate(name);
      setName('');
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="entity-name">{fieldLabel}</Label>
          <Input id="entity-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading || !name}>{loading ? 'Creando…' : 'Crear'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
