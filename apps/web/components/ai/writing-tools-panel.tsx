'use client';

import { useEffect, useState } from 'react';
import { Wand2, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { SceneSummary, Character, Location, StoryObject, BrainstormKind } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Mode = 'continue' | 'rewrite' | 'brainstorm' | 'describe';

const MODES: { id: Mode; label: string }[] = [
  { id: 'continue', label: 'Continuar' },
  { id: 'rewrite', label: 'Reescribir' },
  { id: 'brainstorm', label: 'Brainstorm' },
  { id: 'describe', label: 'Describir' },
];

const BRAINSTORM_KINDS: { id: BrainstormKind; label: string }[] = [
  { id: 'PLOT', label: 'Trama' },
  { id: 'DIALOGUE', label: 'Diálogo' },
  { id: 'CHARACTER', label: 'Personaje' },
  { id: 'SCENE_IDEA', label: 'Idea de escena' },
  { id: 'TWIST', label: 'Giro narrativo' },
  { id: 'OTHER', label: 'Otro' },
];

export function WritingToolsPanel({ projectId, scenes }: { projectId: string; scenes: SceneSummary[] }) {
  const [mode, setMode] = useState<Mode>('continue');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  // Continuar / Reescribir
  const [sceneId, setSceneId] = useState('');
  const [instruction, setInstruction] = useState('');
  const [textToRewrite, setTextToRewrite] = useState('');

  // Brainstorm
  const [brainstormKind, setBrainstormKind] = useState<BrainstormKind>('PLOT');
  const [brainstormPrompt, setBrainstormPrompt] = useState('');

  // Describir
  const [entityType, setEntityType] = useState<'CHARACTER' | 'LOCATION' | 'OBJECT'>('CHARACTER');
  const [entityId, setEntityId] = useState('');
  const [style, setStyle] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [objects, setObjects] = useState<StoryObject[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<Character[]>(`/projects/${projectId}/characters`),
      api.get<Location[]>(`/projects/${projectId}/locations`),
      api.get<StoryObject[]>(`/projects/${projectId}/objects`),
    ]).then(([c, l, o]) => {
      setCharacters(c);
      setLocations(l);
      setObjects(o);
    });
  }, [projectId]);

  function entityOptions() {
    if (entityType === 'CHARACTER') return characters.map((c) => ({ id: c.id, name: c.name }));
    if (entityType === 'LOCATION') return locations.map((l) => ({ id: l.id, name: l.name }));
    return objects.map((o) => ({ id: o.id, name: o.name }));
  }

  async function run() {
    setLoading(true);
    setResult('');
    setCopied(false);
    try {
      if (mode === 'continue') {
        if (!sceneId) return;
        const res = await api.post<{ text: string }>('/ai/assist/continue', { sceneId, instruction: instruction || undefined });
        setResult(res.text);
      } else if (mode === 'rewrite') {
        if (!textToRewrite.trim() || !instruction.trim()) return;
        const res = await api.post<{ text: string }>(`/projects/${projectId}/ai/assist/rewrite`, {
          text: textToRewrite,
          instruction,
          sceneId: sceneId || undefined,
        });
        setResult(res.text);
      } else if (mode === 'brainstorm') {
        if (!brainstormPrompt.trim()) return;
        const res = await api.post<{ text: string }>(`/projects/${projectId}/ai/assist/brainstorm`, {
          prompt: brainstormPrompt,
          kind: brainstormKind,
        });
        setResult(res.text);
      } else if (mode === 'describe') {
        if (!entityId) return;
        const res = await api.post<{ text: string }>(`/projects/${projectId}/ai/assist/describe`, {
          entityType,
          entityId,
          style: style || undefined,
        });
        setResult(res.text);
      }
    } finally {
      setLoading(false);
    }
  }

  function copyResult() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-ink-800 bg-ink-900">
      <div className="flex gap-1 border-b border-ink-800 p-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id);
              setResult('');
            }}
            className={cn(
              'flex-1 rounded-sm px-2 py-1.5 text-xs font-medium transition-colors',
              mode === m.id ? 'bg-brass text-ink-950' : 'text-muted hover:bg-ink-800 hover:text-ink_text',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {mode === 'continue' && (
          <>
            <div>
              <Label>Escena</Label>
              <Select value={sceneId} onChange={(e) => setSceneId(e.target.value)}>
                <option value="">Elegí una escena…</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Indicación (opcional)</Label>
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="ej: que aparezca un giro inesperado, tono más oscuro…"
                rows={2}
              />
            </div>
          </>
        )}

        {mode === 'rewrite' && (
          <>
            <div>
              <Label>Texto a reescribir</Label>
              <Textarea
                value={textToRewrite}
                onChange={(e) => setTextToRewrite(e.target.value)}
                placeholder="Pegá el fragmento…"
                rows={5}
              />
            </div>
            <div>
              <Label>Indicación</Label>
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="ej: más tenso, resumir a la mitad, cambiar a primera persona…"
                rows={2}
              />
            </div>
            <div>
              <Label>Escena de contexto (opcional)</Label>
              <Select value={sceneId} onChange={(e) => setSceneId(e.target.value)}>
                <option value="">Sin contexto adicional</option>
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}

        {mode === 'brainstorm' && (
          <>
            <div>
              <Label>Tipo</Label>
              <Select value={brainstormKind} onChange={(e) => setBrainstormKind(e.target.value as BrainstormKind)}>
                {BRAINSTORM_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Qué necesitás</Label>
              <Textarea
                value={brainstormPrompt}
                onChange={(e) => setBrainstormPrompt(e.target.value)}
                placeholder="ej: opciones para que el protagonista descubra la traición…"
                rows={3}
              />
            </div>
          </>
        )}

        {mode === 'describe' && (
          <>
            <div>
              <Label>Tipo de entidad</Label>
              <Select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value as any);
                  setEntityId('');
                }}
              >
                <option value="CHARACTER">Personaje</option>
                <option value="LOCATION">Lugar</option>
                <option value="OBJECT">Objeto</option>
              </Select>
            </div>
            <div>
              <Label>Entidad</Label>
              <Select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                <option value="">Elegí…</option>
                {entityOptions().map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Estilo (opcional)</Label>
              <Textarea
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="ej: poético y breve, técnico y directo…"
                rows={2}
              />
            </div>
          </>
        )}

        <Button onClick={run} disabled={loading} className="w-full">
          <Wand2 className="h-4 w-4" />
          {loading ? 'Generando…' : 'Generar'}
        </Button>

        {result && (
          <div className="relative rounded-md border border-ink-700 bg-ink-950 p-3">
            <button
              onClick={copyResult}
              className="absolute right-2 top-2 text-muted hover:text-brass-light"
              title="Copiar"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
            <p className="whitespace-pre-wrap pr-6 text-sm text-ink_text">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}
