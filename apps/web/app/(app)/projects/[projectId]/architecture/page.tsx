'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Part, AiProposal } from '@/types/api';
import { VisionPanel } from '@/components/architecture/vision-panel';
import { ArchitectureBoard } from '@/components/architecture/board';
import { InspectorPanel, Selection } from '@/components/architecture/inspector-panel';
import { AiActionsPanel } from '@/components/architecture/ai-actions-panel';
import { ProposalReviewDialog } from '@/components/architecture/proposal-review-dialog';
import { cn } from '@/lib/utils';

type Level = 'acts' | 'sequences' | 'chapters' | 'scenes';

const LEVELS: { id: Level; label: string }[] = [
  { id: 'acts', label: 'Actos' },
  { id: 'sequences', label: 'Secuencias' },
  { id: 'chapters', label: 'Capítulos' },
  { id: 'scenes', label: 'Escenas' },
];

export default function ArchitecturePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [parts, setParts] = useState<Part[]>([]);
  const [level, setLevel] = useState<Level>('chapters');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [reviewProposal, setReviewProposal] = useState<AiProposal | null>(null);
  const [proposalsRefreshKey, setProposalsRefreshKey] = useState(0);

  const load = useCallback(async () => {
    const data = await api.get<Part[]>(`/projects/${projectId}/parts`);
    setParts(data);
    // si la selección actual ya no existe (se borró, o se movió), se recarga desde la data nueva
    setSelection((prev) => {
      if (!prev) return prev;
      if (prev.type === 'part') {
        const fresh = data.find((p) => p.id === prev.data.id);
        return fresh ? { type: 'part', data: fresh } : null;
      }
      return prev;
    });
    return data;
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  function onProposalResolved() {
    setReviewProposal(null);
    setProposalsRefreshKey((k) => k + 1);
    load();
  }

  const totalChapters = parts.reduce((n, p) => n + p.chapters.length + (p.sequences ?? []).reduce((m, s) => m + s.chapters.length, 0), 0);

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl text-ink_text">Arquitectura Narrativa</h1>
          <p className="mt-0.5 text-sm text-muted">Diseñá la estructura macro y el esqueleto de tu historia.</p>
        </div>
      </div>

      <VisionPanel projectId={projectId} />

      {parts.length > 0 && (
        <div className="flex gap-1 self-start rounded-md border border-ink-800 bg-ink-900 p-1">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={cn(
                'rounded-sm px-3 py-1.5 text-sm transition-colors',
                level === l.id ? 'bg-brass text-ink-950' : 'text-muted hover:text-ink_text',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      <div className={cn('grid min-h-0 flex-1 gap-4', selection ? 'grid-cols-[1fr_340px]' : 'grid-cols-[1fr_300px]')}>
        <ArchitectureBoard
          projectId={projectId}
          parts={parts}
          level={level}
          selection={selection}
          onSelect={setSelection}
          onReload={load}
        />

        {selection ? (
          <InspectorPanel
            selection={selection}
            onClose={() => setSelection(null)}
            onChanged={load}
            onDeleted={() => {
              setSelection(null);
              load();
            }}
          />
        ) : (
          <AiActionsPanel projectId={projectId} onOpenProposal={setReviewProposal} refreshKey={proposalsRefreshKey} />
        )}
      </div>

      {totalChapters === 0 && parts.length === 0 && (
        <p className="text-center text-xs text-muted">
          También podés escribir directamente en <span className="text-brass-light">Escribir</span> y volver acá cuando quieras darle forma a la estructura.
        </p>
      )}

      <ProposalReviewDialog proposal={reviewProposal} onClose={() => setReviewProposal(null)} onResolved={onProposalResolved} />
    </div>
  );
}
