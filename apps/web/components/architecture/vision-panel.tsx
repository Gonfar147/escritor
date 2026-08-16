'use client';

import { useEffect, useRef, useState } from 'react';
import { Compass, ChevronDown, Check, Loader2, AlertTriangle, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { NovelVision, Character } from '@/types/api';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef<Partial<NovelVision>>({});

  useEffect(() => {
    api.get<NovelVision | null>(`/projects/${projectId}/architecture/vision`).then((v) => {
      setVision(v ?? {});
      latest.current = v ?? {};
    });
    api.get<Character[]>(`/projects/${projectId}/characters`).then(setCharacters);
  }, [projectId]);

  function update<K extends keyof NovelVision>(key: K, value: NovelVision[K]) {
    const next = { ...vision, [key]: value };
    setVision(next);
    latest.current = next;
    setSaveState('idle');
    setErrorMessage(null);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => save(next), 800);
  }

  async function save(next: Partial<NovelVision> = latest.current) {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    }
    setSaveState('saving');
    try {
      const { id, projectId: _p, ...payload } = next as NovelVision;
      await api.put(`/projects/${projectId}/architecture/vision`, payload);
      setSaveState('saved');
      setErrorMessage(null);
    } catch (err) {
      setSaveState('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'No se pudo guardar. Revisá tu conexión.');
    }
  }

  const filledCount = FIELDS.filter((f) => vision[f.key]).length;

  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v);
        }}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-brass" strokeWidth={1.5} />
          <span className="font-display text-sm text-ink_text">Visión</span>
          <span className="text-xs text-muted">{filledCount === 0 ? 'vacía todavía' : `${filledCount}/${FIELDS.length} completados`}</span>
        </div>
        <div className="flex items-center gap-3">
          {saveState === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
            </span>
          )}
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-verdigris-light">
              <Check className="h-3.5 w-3.5" /> Guardado
            </span>
          )}
          {saveState === 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-brick-light">
              <AlertTriangle className="h-3.5 w-3.5" /> Error al guardar
            </span>
          )}
          {expanded && (
            <Button
              variant="secondary"
              size="sm"
              disabled={saveState === 'saving'}
              onClick={(e) => {
                e.stopPropagation();
                save();
              }}
            >
              <Save className="h-3.5 w-3.5" /> Guardar
            </Button>
          )}
          <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', expanded && 'rotate-180')} />
        </div>
      </div>

      {saveState === 'error' && (
        <p className="flex items-center gap-1.5 px-4 pb-2 text-xs text-brick-light">
          {errorMessage ?? 'No se pudo guardar.'}{' '}
          <button onClick={() => save()} className="underline hover:text-brick">
            Reintentar
          </button>
        </p>
      )}

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
