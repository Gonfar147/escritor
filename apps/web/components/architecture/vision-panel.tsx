'use client';

import { useEffect, useRef, useState } from 'react';
import { Compass, ChevronDown, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { NovelVision, Character } from '@/types/api';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const FIELDS: { key: keyof NovelVision; label: string; placeholder: string }[] = [
  { key: 'premise', label: 'Premisa', placeholder: 'La idea en una frase: "Una colonia humana descubre que..."' },
  { key: 'centralTheme', label: 'Tema central', placeholder: '¿De qué habla realmente esta novela?' },
  { key: 'centralQuestion', label: 'Pregunta central', placeholder: '¿Qué pregunta mantiene al lector enganchado?' },
  { key: 'centralConflict', label: 'Conflicto central', placeholder: '¿Qué fuerza se opone a qué otra?' },
  { key: 'mainGoal', label: 'Objetivo principal', placeholder: '¿Qué busca conseguir el protagonista?' },
  { key: 'antagonism', label: 'Antagonismo', placeholder: '¿Qué o quién se opone?' },
  { key: 'worldNotes', label: 'Mundo', placeholder: 'Notas sobre el mundo de la novela' },
  { key: 'expectedEnding', label: 'Final previsto', placeholder: 'Puede cambiar — es solo una brújula' },
  { key: 'generalNotes', label: 'Notas generales', placeholder: '' },
];

export function VisionPanel({ projectId }: { projectId: string }) {
  const [vision, setVision] = useState<Partial<NovelVision>>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.get<NovelVision | null>(`/projects/${projectId}/architecture/vision`).then((v) => setVision(v ?? {}));
    api.get<Character[]>(`/projects/${projectId}/characters`).then(setCharacters);
  }, [projectId]);

  function update<K extends keyof NovelVision>(key: K, value: NovelVision[K]) {
    const next = { ...vision, [key]: value };
    setVision(next);
    setSaveState('idle');
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => save(next), 800);
  }

  async function save(next: Partial<NovelVision>) {
    setSaveState('saving');
    const { id, projectId: _p, ...payload } = next as NovelVision;
    await api.put(`/projects/${projectId}/architecture/vision`, payload);
    setSaveState('saved');
  }

  const filledCount = FIELDS.filter((f) => vision[f.key]).length;

  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-brass" strokeWidth={1.5} />
          <span className="font-display text-sm text-ink_text">Visión</span>
          <span className="text-xs text-muted">{filledCount === 0 ? 'vacía todavía' : `${filledCount}/${FIELDS.length} completados`}</span>
        </div>
        <div className="flex items-center gap-3">
          {saveState === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />}
          {saveState === 'saved' && <Check className="h-3.5 w-3.5 text-verdigris-light" />}
          <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {!expanded && vision.premise && (
        <p className="line-clamp-1 px-4 pb-3 text-sm text-muted">{vision.premise}</p>
      )}

      {expanded && (
        <div className="grid gap-4 border-t border-ink-800 p-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.key === 'premise' || f.key === 'generalNotes' ? 'sm:col-span-2' : ''}>
              <Label>{f.label}</Label>
              <Textarea
                rows={f.key === 'premise' ? 2 : 2}
                value={(vision[f.key] as string) ?? ''}
                onChange={(e) => update(f.key, e.target.value as any)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <div>
            <Label>Protagonista</Label>
            <Select
              value={vision.protagonistCharacterId ?? ''}
              onChange={(e) => update('protagonistCharacterId', (e.target.value || null) as any)}
            >
              <option value="">Sin definir</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted">Vincula con un personaje existente del módulo Personajes.</p>
          </div>
        </div>
      )}
    </div>
  );
}
