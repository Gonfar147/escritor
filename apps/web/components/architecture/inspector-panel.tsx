'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, Loader2, Trash2, X, Plus, PenLine, AlertTriangle, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Part, Sequence, Chapter, SceneSummary, ArchitectureStatus, Character, Location } from '@/types/api';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export type Selection =
  | { type: 'part'; data: Part }
  | { type: 'sequence'; data: Sequence }
  | { type: 'chapter'; data: Chapter }
  | { type: 'scene'; data: SceneSummary; chapterId: string };

const STATUS_OPTIONS: { value: ArchitectureStatus; label: string }[] = [
  { value: 'IDEA', label: 'Idea' },
  { value: 'PLANNING', label: 'Planificación' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'REVISED', label: 'Revisado' },
  { value: 'DONE', label: 'Finalizado' },
];

const CHAPTER_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'REVIEW', label: 'Revisión' },
  { value: 'DONE', label: 'Terminado' },
];

function useAutosave<T extends Record<string, any>>(initial: T, endpoint: string, method: 'patch' | 'put' = 'patch') {
  const [form, setForm] = useState<T>(initial);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  // Guarda el valor más reciente del form para que "Guardar ahora" (botón manual)
  // siempre mande lo último, incluso si el debounce todavía no disparó.
  const latest = useRef<T>(initial);

  useEffect(() => {
    setForm(initial);
    latest.current = initial;
  }, [initial]);

  function update<K extends keyof T>(key: K, value: T[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    latest.current = next;
    setSaveState('idle');
    setErrorMessage(null);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => save(next), 800);
  }

  async function save(next: T = latest.current) {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    }
    setSaveState('saving');
    try {
      await api[method](endpoint, next);
      setSaveState('saved');
      setErrorMessage(null);
    } catch (err) {
      // Antes esto fallaba en silencio: el cambio se perdía y no había forma
      // de saberlo. Ahora queda un estado de error visible + botón de reintentar.
      setSaveState('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'No se pudo guardar. Revisá tu conexión.');
    }
  }

  return { form, update, saveState, errorMessage, saveNow: () => save() };
}

function SaveIndicator({
  state,
  errorMessage,
  onRetry,
}: {
  state: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage?: string | null;
  onRetry?: () => void;
}) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-verdigris-light">
        <Check className="h-3.5 w-3.5" /> Guardado
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-brick-light">
        <AlertTriangle className="h-3.5 w-3.5" />
        {errorMessage ?? 'No se pudo guardar'}
        {onRetry && (
          <button onClick={onRetry} className="underline hover:text-brick">
            Reintentar
          </button>
        )}
      </span>
    );
  }
  return null;
}

function SaveBar({
  saveState,
  errorMessage,
  onSaveNow,
}: {
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  errorMessage?: string | null;
  onSaveNow: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-ink-800 bg-ink-950/40 px-2.5 py-2">
      <SaveIndicator state={saveState} errorMessage={errorMessage} onRetry={onSaveNow} />
      <Button variant="secondary" size="sm" onClick={onSaveNow} disabled={saveState === 'saving'}>
        <Save className="h-3.5 w-3.5" /> Guardar
      </Button>
    </div>
  );
}

export function InspectorPanel({
  selection,
  onClose,
  onChanged,
  onDeleted,
}: {
  selection: Selection;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  return (
    <div className="flex h-full flex-col border-l border-ink-800 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-800 px-4 py-3">
        <span className="text-xs uppercase tracking-wide text-muted">
          {selection.type === 'part' && 'Parte / Acto'}
          {selection.type === 'sequence' && 'Secuencia'}
          {selection.type === 'chapter' && 'Capítulo'}
          {selection.type === 'scene' && 'Escena'}
        </span>
        <button onClick={onClose} className="text-muted hover:text-ink_text">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {selection.type === 'part' && <PartInspector part={selection.data} onChanged={onChanged} onDeleted={onDeleted} />}
        {selection.type === 'sequence' && <SequenceInspector sequence={selection.data} onChanged={onChanged} onDeleted={onDeleted} />}
        {selection.type === 'chapter' && <ChapterInspector chapter={selection.data} onChanged={onChanged} onDeleted={onDeleted} />}
        {selection.type === 'scene' && (
          <SceneInspector scene={selection.data} chapterId={selection.chapterId} onChanged={onChanged} onDeleted={onDeleted} />
        )}
      </div>
    </div>
  );
}

// ---- Parte ----

function PartInspector({ part, onChanged, onDeleted }: { part: Part; onChanged: () => void; onDeleted: () => void }) {
  const { form, update, saveState, errorMessage, saveNow } = useAutosave(part, `/parts/${part.id}`);

  async function remove() {
    if (!confirm(`¿Eliminar "${form.title}" y todo su contenido? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/parts/${part.id}`);
    onDeleted();
  }

  return (
    <div className="space-y-4">
      <SaveBar saveState={saveState} errorMessage={errorMessage} onSaveNow={saveNow} />
      <Field label="Título">
        <Input value={form.title} onChange={(e) => update('title', e.target.value)} />
      </Field>
      <Field label="Cómo lo llamás" hint='"Acto", "Parte", "Bloque", "Sección"...'>
        <Input value={form.label} onChange={(e) => update('label', e.target.value)} onBlur={() => onChanged()} />
      </Field>
      <Field label="Estado">
        <Select value={form.planningStatus ?? ''} onChange={(e) => update('planningStatus', (e.target.value || null) as any)}>
          <option value="">Sin definir</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </Field>
      <Field label="Función narrativa" hint="¿Qué función cumple esta parte dentro de la historia?">
        <Textarea rows={2} value={form.narrativeFunction ?? ''} onChange={(e) => update('narrativeFunction', e.target.value)} />
      </Field>
      <Field label="Objetivo">
        <Textarea rows={2} value={form.objective ?? ''} onChange={(e) => update('objective', e.target.value)} />
      </Field>
      <Field label="Conflicto">
        <Textarea rows={2} value={form.conflict ?? ''} onChange={(e) => update('conflict', e.target.value)} />
      </Field>
      <Field label="Notas">
        <Textarea rows={3} value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
      </Field>
      <Button variant="danger" size="sm" onClick={remove}>
        <Trash2 className="h-3.5 w-3.5" /> Eliminar
      </Button>
    </div>
  );
}

// ---- Secuencia ----

function SequenceInspector({ sequence, onChanged, onDeleted }: { sequence: Sequence; onChanged: () => void; onDeleted: () => void }) {
  const { form, update, saveState, errorMessage, saveNow } = useAutosave(sequence, `/sequences/${sequence.id}`, 'put');

  async function remove() {
    if (!confirm(`¿Eliminar la secuencia "${form.title}"? Sus capítulos pasan a colgar directo de la Parte.`)) return;
    await api.delete(`/sequences/${sequence.id}`);
    onDeleted();
  }

  return (
    <div className="space-y-4">
      <SaveBar saveState={saveState} errorMessage={errorMessage} onSaveNow={saveNow} />
      <Field label="Título">
        <Input value={form.title} onChange={(e) => update('title', e.target.value)} />
      </Field>
      <Field label="Estado">
        <Select value={form.planningStatus ?? ''} onChange={(e) => update('planningStatus', (e.target.value || null) as any)}>
          <option value="">Sin definir</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </Field>
      <Field label="Función narrativa">
        <Textarea rows={2} value={form.narrativeFunction ?? ''} onChange={(e) => update('narrativeFunction', e.target.value)} />
      </Field>
      <Field label="Objetivo">
        <Textarea rows={2} value={form.objective ?? ''} onChange={(e) => update('objective', e.target.value)} />
      </Field>
      <Field label="Conflicto">
        <Textarea rows={2} value={form.conflict ?? ''} onChange={(e) => update('conflict', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Comienzo">
          <Textarea rows={2} value={form.beginning ?? ''} onChange={(e) => update('beginning', e.target.value)} />
        </Field>
        <Field label="Final">
          <Textarea rows={2} value={form.ending ?? ''} onChange={(e) => update('ending', e.target.value)} />
        </Field>
      </div>
      <Field label="Consecuencias" hint="¿Qué desencadena para lo que sigue?">
        <Textarea rows={2} value={form.consequences ?? ''} onChange={(e) => update('consequences', e.target.value)} />
      </Field>
      <Field label="Notas">
        <Textarea rows={3} value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
      </Field>
      <Button variant="danger" size="sm" onClick={remove}>
        <Trash2 className="h-3.5 w-3.5" /> Eliminar secuencia
      </Button>
    </div>
  );
}

// ---- Capítulo ----

function ChapterInspector({ chapter, onChanged, onDeleted }: { chapter: Chapter; onChanged: () => void; onDeleted: () => void }) {
  const { projectId } = useParams<{ projectId: string }>();
  const { form, update, saveState, errorMessage, saveNow } = useAutosave(chapter, `/chapters/${chapter.id}`);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [linkedCharacters, setLinkedCharacters] = useState<{ characterId: string; role?: string | null }[]>([]);
  const [linkedLocations, setLinkedLocations] = useState<{ locationId: string }[]>([]);

  useEffect(() => {
    api.get<Character[]>(`/projects/${projectId}/characters`).then(setCharacters);
    api.get<Location[]>(`/projects/${projectId}/locations`).then(setLocations);
  }, [projectId]);

  useEffect(() => {
    // el detalle completo del capítulo (con characterLinks/locationLinks) no viaja en el árbol liviano del tablero
    api.get<any>(`/chapters/${chapter.id}`).catch(() => null).then((full) => {
      if (full) {
        setLinkedCharacters(full.characterLinks?.map((l: any) => ({ characterId: l.characterId, role: l.role })) ?? []);
        setLinkedLocations(full.locationLinks?.map((l: any) => ({ locationId: l.locationId })) ?? []);
      }
    });
  }, [chapter.id]);

  async function remove() {
    if (!confirm(`¿Eliminar el capítulo "${form.title}" y todas sus escenas?`)) return;
    await api.delete(`/chapters/${chapter.id}`);
    onDeleted();
  }

  async function addCharacter(characterId: string) {
    if (!characterId) return;
    await api.post(`/chapters/${chapter.id}/characters`, { characterId });
    setLinkedCharacters((prev) => [...prev, { characterId }]);
  }

  async function removeCharacter(characterId: string) {
    await api.delete(`/chapters/${chapter.id}/characters/${characterId}`);
    setLinkedCharacters((prev) => prev.filter((l) => l.characterId !== characterId));
  }

  async function addLocation(locationId: string) {
    if (!locationId) return;
    await api.post(`/chapters/${chapter.id}/locations`, { locationId });
    setLinkedLocations((prev) => [...prev, { locationId }]);
  }

  async function removeLocation(locationId: string) {
    await api.delete(`/chapters/${chapter.id}/locations/${locationId}`);
    setLinkedLocations((prev) => prev.filter((l) => l.locationId !== locationId));
  }

  return (
    <div className="space-y-4">
      <SaveBar saveState={saveState} errorMessage={errorMessage} onSaveNow={saveNow} />
      <Field label="Título">
        <Input value={form.title} onChange={(e) => update('title', e.target.value)} />
      </Field>
      <Field label="Estado">
        <Select value={form.status} onChange={(e) => update('status', e.target.value as any)}>
          {CHAPTER_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </Field>
      <Field label="Función narrativa" hint="¿Qué función cumple este capítulo dentro de la historia?">
        <Textarea rows={2} value={form.narrativeFunction ?? ''} onChange={(e) => update('narrativeFunction', e.target.value)} />
      </Field>
      <Field label="Objetivo" hint="¿Qué debe conseguir el capítulo?">
        <Textarea rows={2} value={form.objective ?? ''} onChange={(e) => update('objective', e.target.value)} />
      </Field>
      <Field label="Conflicto" hint="¿Qué impide conseguirlo?">
        <Textarea rows={2} value={form.conflict ?? ''} onChange={(e) => update('conflict', e.target.value)} />
      </Field>
      <Field label="Cambio" hint="¿Qué cambia entre el comienzo y el final?">
        <Textarea rows={2} value={form.change ?? ''} onChange={(e) => update('change', e.target.value)} />
      </Field>
      <Field label="Información a revelar">
        <Textarea rows={2} value={form.infoToReveal ?? ''} onChange={(e) => update('infoToReveal', e.target.value)} />
      </Field>
      <Field label="Información protegida" hint="Qué NO debe revelarse todavía">
        <Textarea rows={2} value={form.infoToProtect ?? ''} onChange={(e) => update('infoToProtect', e.target.value)} />
      </Field>
      <Field label="Gancho" hint="¿Qué deja preparado para lo siguiente?">
        <Textarea rows={2} value={form.hook ?? ''} onChange={(e) => update('hook', e.target.value)} />
      </Field>

      <Field label="Personajes">
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {linkedCharacters.map((l) => {
            const c = characters.find((x) => x.id === l.characterId);
            return (
              <span key={l.characterId} className="flex items-center gap-1 rounded-sm bg-ink-800 px-2 py-1 text-xs text-ink_text">
                {c?.name ?? '…'}
                <button onClick={() => removeCharacter(l.characterId)} className="text-muted hover:text-brick-light"><X className="h-3 w-3" /></button>
              </span>
            );
          })}
        </div>
        <Select value="" onChange={(e) => addCharacter(e.target.value)}>
          <option value="">+ Vincular personaje…</option>
          {characters.filter((c) => !linkedCharacters.some((l) => l.characterId === c.id)).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="Escenarios">
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {linkedLocations.map((l) => {
            const loc = locations.find((x) => x.id === l.locationId);
            return (
              <span key={l.locationId} className="flex items-center gap-1 rounded-sm bg-ink-800 px-2 py-1 text-xs text-ink_text">
                {loc?.name ?? '…'}
                <button onClick={() => removeLocation(l.locationId)} className="text-muted hover:text-brick-light"><X className="h-3 w-3" /></button>
              </span>
            );
          })}
        </div>
        <Select value="" onChange={(e) => addLocation(e.target.value)}>
          <option value="">+ Vincular escenario…</option>
          {locations.filter((loc) => !linkedLocations.some((l) => l.locationId === loc.id)).map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="Notas">
        <Textarea rows={3} value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
      </Field>

      <div className="flex items-center justify-between pt-2">
        <Link href={`/projects/${projectId}/editor`} className="flex items-center gap-1.5 text-sm text-brass-light hover:underline">
          <PenLine className="h-3.5 w-3.5" /> Planificar escenas
        </Link>
        <Button variant="danger" size="sm" onClick={remove}>
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </Button>
      </div>
    </div>
  );
}

// ---- Escena ----

function SceneInspector({ scene, onChanged, onDeleted }: { scene: SceneSummary; chapterId: string; onChanged: () => void; onDeleted: () => void }) {
  const { projectId } = useParams<{ projectId: string }>();
  const { form, update, saveState, errorMessage, saveNow } = useAutosave(scene, `/scenes/${scene.id}`);

  async function remove() {
    if (!confirm(`¿Eliminar la escena "${form.title}"?`)) return;
    await api.delete(`/scenes/${scene.id}`);
    onDeleted();
  }

  return (
    <div className="space-y-4">
      <SaveBar saveState={saveState} errorMessage={errorMessage} onSaveNow={saveNow} />
      <Field label="Título">
        <Input value={form.title} onChange={(e) => update('title', e.target.value)} />
      </Field>
      <Field label="Objetivo">
        <Textarea rows={2} value={form.objective ?? ''} onChange={(e) => update('objective', e.target.value)} />
      </Field>
      <Field label="Conflicto">
        <Textarea rows={2} value={form.conflict ?? ''} onChange={(e) => update('conflict', e.target.value)} />
      </Field>
      <Field label="Cambio emocional">
        <Textarea rows={2} value={form.emotionalChange ?? ''} onChange={(e) => update('emotionalChange', e.target.value)} />
      </Field>
      <Field label="Información revelada">
        <Textarea rows={2} value={form.infoRevealed ?? ''} onChange={(e) => update('infoRevealed', e.target.value)} />
      </Field>
      <Field label="Información protegida">
        <Textarea rows={2} value={form.infoProtected ?? ''} onChange={(e) => update('infoProtected', e.target.value)} />
      </Field>
      <Field label="Transición">
        <Textarea rows={2} value={form.transition ?? ''} onChange={(e) => update('transition', e.target.value)} />
      </Field>
      <Field label="Notas">
        <Textarea rows={3} value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
      </Field>

      <div className="flex items-center justify-between pt-2">
        <Link href={`/projects/${projectId}/editor`} className="flex items-center gap-1.5 text-sm text-brass-light hover:underline">
          <PenLine className="h-3.5 w-3.5" /> Escribir esta escena
        </Link>
        <Button variant="danger" size="sm" onClick={remove}>
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
