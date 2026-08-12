'use client';

import { useEffect, useState } from 'react';
import { UserX, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { ForgottenCharacter } from '@/types/api';
import { Button } from '@/components/ui/button';

export function ForgottenCharactersWidget({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<ForgottenCharacter[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<ForgottenCharacter[]>(`/projects/${projectId}/ai/consistency/forgotten-characters`);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-sm text-ink_text">
          <UserX className="h-4 w-4 text-brass" /> Personajes que quizás olvidaste
        </h3>
        <button onClick={load} className="text-muted hover:text-brass-light" title="Actualizar">
          <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
        </button>
      </div>

      {items && items.length === 0 && (
        <p className="text-sm text-muted">Ningún personaje vivo lleva demasiado tiempo sin aparecer. Buen trabajo.</p>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="rounded-md border border-ink-800 bg-ink-950 px-3 py-2 text-sm">
              <div className="font-medium text-ink_text">{c.name}</div>
              <div className="text-xs text-muted">
                {c.lastAppearance
                  ? `Última aparición: "${c.lastAppearance.sceneTitle}" — ${c.scenesSinceLastAppearance} escenas atrás`
                  : 'Todavía no aparece en ninguna escena'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
