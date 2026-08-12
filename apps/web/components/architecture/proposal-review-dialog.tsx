'use client';

import { useState } from 'react';
import { Check, X, Pencil, Sparkles, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import {
  AiProposal, StructureProposalContent, StructureDiscoveryContent,
  CoherenceAnalysisContent, ProposedAct, DiscoveredAct,
} from '@/types/api';

const TYPE_LABELS: Record<string, string> = {
  FULL_STRUCTURE: 'Estructura propuesta',
  STRUCTURE_DISCOVERY: 'Estructura detectada',
  COHERENCE_ANALYSIS: 'Análisis de coherencia',
  ACT_STRUCTURE: 'Acto propuesto',
  SEQUENCE: 'Secuencia propuesta',
  CHAPTER: 'Capítulo propuesto',
  CHARACTER_ARC: 'Arco de personaje propuesto',
  REORGANIZATION: 'Reorganización propuesta',
  OTHER: 'Propuesta',
};

export function ProposalReviewDialog({
  proposal,
  onClose,
  onResolved,
}: {
  proposal: AiProposal | null;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!proposal) return null;
  const isInformative = proposal.type === 'COHERENCE_ANALYSIS';

  function startEditing() {
    setRawJson(JSON.stringify(proposal!.content, null, 2));
    setEditing(true);
  }

  async function resolve(status: 'ACCEPTED' | 'REJECTED' | 'MODIFIED') {
    setLoading(true);
    setError('');
    try {
      const body: any = { status };
      if (status === 'MODIFIED') {
        try {
          body.appliedContent = JSON.parse(rawJson);
        } catch {
          setError('El JSON editado no es válido.');
          setLoading(false);
          return;
        }
      }
      await api.post(`/architecture/proposals/${proposal!.id}/resolve`, body);
      onResolved();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo resolver la propuesta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!proposal} onClose={onClose} title={TYPE_LABELS[proposal.type] ?? 'Propuesta de IA'} className="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles className="h-3.5 w-3.5 text-brass" />
          Propuesta de IA — no se aplicó nada todavía a tu novela.
        </div>

        {proposal.contextSummary && <p className="text-xs italic text-muted">{proposal.contextSummary}</p>}

        <div className="max-h-96 overflow-y-auto rounded-md border border-ink-800 bg-ink-950 p-3">
          {editing ? (
            <Textarea rows={16} value={rawJson} onChange={(e) => setRawJson(e.target.value)} className="font-mono text-xs" />
          ) : (
            <ProposalContentView proposal={proposal} />
          )}
        </div>

        {error && <p className="text-sm text-brick-light">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {!isInformative && !editing && (
            <button onClick={startEditing} className="flex items-center gap-1.5 rounded-md border border-ink-700 px-3 py-1.5 text-sm text-muted hover:text-ink_text">
              <Pencil className="h-3.5 w-3.5" /> Modificar antes de aplicar
            </button>
          )}
          {editing && (
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={loading}>Cancelar edición</Button>
          )}
          <Button variant="danger" onClick={() => resolve('REJECTED')} disabled={loading}>
            <X className="h-3.5 w-3.5" /> {isInformative ? 'Descartar' : 'Rechazar'}
          </Button>
          {!isInformative && (
            <Button onClick={() => resolve(editing ? 'MODIFIED' : 'ACCEPTED')} disabled={loading}>
              <Check className="h-3.5 w-3.5" /> {editing ? 'Aplicar con cambios' : 'Aplicar propuesta'}
            </Button>
          )}
          {isInformative && (
            <Button onClick={() => resolve('ACCEPTED')} disabled={loading}>
              <Check className="h-3.5 w-3.5" /> Marcar como revisado
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function ProposalContentView({ proposal }: { proposal: AiProposal }) {
  if (proposal.type === 'COHERENCE_ANALYSIS') {
    const content = proposal.content as CoherenceAnalysisContent;
    if (content.findings.length === 0) {
      return <p className="text-sm text-muted">No se encontraron problemas relevantes. Buen trabajo.</p>;
    }
    return (
      <div className="space-y-3">
        {content.findings.map((f, i) => (
          <div key={i} className="rounded-md border border-ink-800 p-2.5">
            <div className="flex items-center gap-1.5">
              {f.severity === 'issue' && <AlertCircle className="h-3.5 w-3.5 text-brick-light" />}
              {f.severity === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-brass-light" />}
              {f.severity === 'info' && <Info className="h-3.5 w-3.5 text-verdigris-light" />}
              <span className="text-sm font-medium text-ink_text">{f.title}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{f.explanation}</p>
            {f.suggestion && <p className="mt-1 text-xs italic text-brass-light">Sugerencia: {f.suggestion}</p>}
          </div>
        ))}
      </div>
    );
  }

  if (proposal.type === 'FULL_STRUCTURE') {
    const content = proposal.content as StructureProposalContent;
    return (
      <div className="space-y-3 text-sm">
        {content.reasoning && <p className="text-xs italic text-muted">{content.reasoning}</p>}
        {content.acts.map((act, i) => <ActPreview key={i} act={act} label={content.actLabel ?? 'Acto'} />)}
      </div>
    );
  }

  if (proposal.type === 'STRUCTURE_DISCOVERY') {
    const content = proposal.content as StructureDiscoveryContent;
    return (
      <div className="space-y-3 text-sm">
        {content.reasoning && <p className="text-xs italic text-muted">{content.reasoning}</p>}
        {content.acts.map((act, i) => <DiscoveredActPreview key={i} act={act} label={content.actLabel ?? 'Acto'} />)}
      </div>
    );
  }

  return <pre className="whitespace-pre-wrap text-xs text-muted">{JSON.stringify(proposal.content, null, 2)}</pre>;
}

function ActPreview({ act, label }: { act: ProposedAct; label: string }) {
  return (
    <div className="rounded-md border border-ink-800 p-2.5">
      <p className="font-medium text-ink_text">{label} — {act.title}</p>
      {act.objective && <p className="text-xs text-muted">Objetivo: {act.objective}</p>}
      <ul className="mt-1.5 space-y-0.5 pl-3 text-xs text-muted">
        {(act.chapters ?? []).map((c, i) => <li key={i}>• {c.title}</li>)}
        {(act.sequences ?? []).map((s, i) => (
          <li key={i}>
            ▸ {s.title}
            <ul className="pl-3">{s.chapters.map((c, j) => <li key={j}>• {c.title}</li>)}</ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiscoveredActPreview({ act, label }: { act: DiscoveredAct; label: string }) {
  const chapterCount = (act.chapterIds?.length ?? 0) + (act.sequences ?? []).reduce((n, s) => n + s.chapterIds.length, 0);
  return (
    <div className="rounded-md border border-ink-800 p-2.5">
      <p className="font-medium text-ink_text">{label} — {act.title}</p>
      {act.objective && <p className="text-xs text-muted">Objetivo: {act.objective}</p>}
      <p className="mt-1 text-xs text-muted">{chapterCount} capítulo(s) existentes agrupados acá</p>
    </div>
  );
}
