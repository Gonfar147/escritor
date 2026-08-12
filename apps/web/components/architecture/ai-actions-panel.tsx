'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Search, ClipboardCheck, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { AiProposal } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const TYPE_LABELS: Record<string, string> = {
  FULL_STRUCTURE: 'Estructura propuesta',
  STRUCTURE_DISCOVERY: 'Estructura detectada',
  COHERENCE_ANALYSIS: 'Análisis de coherencia',
  ACT_STRUCTURE: 'Acto propuesto',
  SEQUENCE: 'Secuencia propuesta',
  CHAPTER: 'Capítulo propuesto',
  CHARACTER_ARC: 'Arco propuesto',
  REORGANIZATION: 'Reorganización propuesta',
  OTHER: 'Propuesta',
};

export function AiActionsPanel({
  projectId,
  onOpenProposal,
  refreshKey,
}: {
  projectId: string;
  onOpenProposal: (p: AiProposal) => void;
  refreshKey: number;
}) {
  const [pending, setPending] = useState<AiProposal[]>([]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState<'construct' | 'discover' | 'analyze' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<AiProposal[]>(`/projects/${projectId}/architecture/proposals?status=PENDING`).then(setPending);
  }, [projectId, refreshKey]);

  async function constructWithAi() {
    if (!prompt.trim()) return;
    setBusy('construct');
    setError('');
    try {
      const proposal = await api.post<AiProposal>(`/projects/${projectId}/architecture/construct-with-ai`, { prompt });
      setPrompt('');
      setPending((p) => [proposal, ...p]);
      onOpenProposal(proposal);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo generar una propuesta.');
    } finally {
      setBusy(null);
    }
  }

  async function discoverStructure() {
    setBusy('discover');
    setError('');
    try {
      const proposal = await api.post<AiProposal>(`/projects/${projectId}/architecture/discover-structure`);
      setPending((p) => [proposal, ...p]);
      onOpenProposal(proposal);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo analizar la estructura existente.');
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    setBusy('analyze');
    setError('');
    try {
      const proposal = await api.post<AiProposal>(`/projects/${projectId}/architecture/analyze`);
      setPending((p) => [proposal, ...p]);
      onOpenProposal(proposal);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo correr el análisis.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-ink-800 bg-ink-900 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brass" strokeWidth={1.5} />
        <span className="font-display text-sm text-ink_text">Construir con IA</span>
      </div>
      <Textarea
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ideas sueltas: qué pasa, quién descubre qué, cómo termina…"
      />
      <Button size="sm" onClick={constructWithAi} disabled={busy !== null || !prompt.trim()}>
        {busy === 'construct' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        Proponer estructura
      </Button>

      <div className="my-1 border-t border-ink-800" />

      <button
        onClick={discoverStructure}
        disabled={busy !== null}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink_text disabled:opacity-50"
      >
        {busy === 'discover' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        Analizar estructura existente
      </button>
      <button
        onClick={analyze}
        disabled={busy !== null}
        className="flex items-center gap-2 text-sm text-muted hover:text-ink_text disabled:opacity-50"
      >
        {busy === 'analyze' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
        Ver análisis de coherencia
      </button>

      {error && <p className="text-xs text-brick-light">{error}</p>}

      {pending.length > 0 && (
        <div className="mt-1 space-y-1.5 border-t border-ink-800 pt-3">
          <p className="text-xs uppercase tracking-wide text-muted">Propuestas pendientes</p>
          {pending.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpenProposal(p)}
              className="flex w-full items-center justify-between rounded-sm bg-ink-800 px-2.5 py-2 text-left text-xs text-ink_text hover:bg-ink-700"
            >
              <span>{TYPE_LABELS[p.type] ?? p.type}</span>
              <span className="text-muted">Revisar →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
