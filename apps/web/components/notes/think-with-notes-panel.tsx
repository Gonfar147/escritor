'use client';

import { useState } from 'react';
import { Link2, Lightbulb, Brain as BrainIcon, Swords, Blocks, AlertTriangle, Save, X as XIcon, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { AiProposal, Note, NoteAiMode, NoteInsight, NoteThinkContent } from '@/types/api';

const MODES: { value: NoteAiMode; label: string; description: string; icon: typeof Link2 }[] = [
  { value: 'CONNECT', label: 'Conectar', description: 'Encuentra conexiones entre estas notas.', icon: Link2 },
  { value: 'GENERATE_IDEAS', label: 'Generar ideas', description: 'Propone nuevas posibilidades narrativas.', icon: Lightbulb },
  { value: 'DEEPEN', label: 'Profundizar', description: 'Explora las implicaciones de estas ideas.', icon: BrainIcon },
  { value: 'FIND_CONFLICTS', label: 'Buscar conflictos', description: 'Conflictos narrativos derivados de estas notas.', icon: Swords },
  { value: 'BUILD', label: 'Construir', description: 'Cómo convertirlas en trama, capítulo o escena.', icon: Blocks },
  { value: 'FIND_CONTRADICTIONS', label: 'Buscar contradicciones', description: 'Incompatibilidades o problemas de continuidad.', icon: AlertTriangle },
];

export function ThinkWithNotesPanel({
  open,
  onClose,
  projectId,
  noteIds,
  onNoteCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  noteIds: string[];
  onNoteCreated: (note: Note) => void;
}) {
  const [mode, setMode] = useState<NoteAiMode | null>(null);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const [dismissedIndexes, setDismissedIndexes] = useState<Set<number>>(new Set());

  async function runMode(m: NoteAiMode) {
    setMode(m);
    setLoading(true);
    setError(null);
    setProposal(null);
    setSavedIndexes(new Set());
    setDismissedIndexes(new Set());
    try {
      const result = await api.post<AiProposal>(`/projects/${projectId}/notes/think`, { noteIds, mode: m });
      setProposal(result);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo generar el análisis. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function saveInsight(index: number, insight: NoteInsight) {
    const note = await api.post<Note>(`/projects/${projectId}/notes/ai-proposals/${proposal!.id}/save-as-note`, {
      title: insight.title,
      content: insight.body,
    });
    setSavedIndexes((prev) => new Set(prev).add(index));
    onNoteCreated(note);
  }

  function reset() {
    setMode(null);
    setProposal(null);
    setError(null);
    setSavedIndexes(new Set());
    setDismissedIndexes(new Set());
  }

  function handleClose() {
    reset();
    onClose();
  }

  const content = proposal?.content as NoteThinkContent | undefined;

  return (
    <Dialog open={open} onClose={handleClose} title="🧠 Pensar con estas notas" className="max-w-2xl">
      {!mode && (
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => runMode(m.value)}
              className="flex flex-col items-start gap-1 rounded-md border border-ink-700 bg-ink-800 p-3 text-left transition-colors hover:border-brass/50 hover:bg-ink-800/80"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-ink_text">
                <m.icon className="h-4 w-4 text-brass-light" /> {m.label}
              </span>
              <span className="text-xs text-muted">{m.description}</span>
            </button>
          ))}
        </div>
      )}

      {mode && (
        <div>
          <button onClick={reset} className="mb-3 text-xs text-muted hover:text-ink_text">
            ← Elegir otro modo
          </button>

          {loading && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Pensando con {noteIds.length} nota{noteIds.length > 1 ? 's' : ''}…
            </div>
          )}

          {error && <p className="py-4 text-sm text-brick-light">{error}</p>}

          {content && (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto">
              {content.insights.map((insight, i) => {
                if (dismissedIndexes.has(i)) return null;
                return (
                  <div key={i} className="rounded-md border border-ink-700 bg-ink-800 p-4">
                    <h4 className="font-display text-sm text-brass-light">{insight.title}</h4>
                    <p className="mt-1.5 text-sm text-ink_text/90">{insight.body}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => saveInsight(i, insight)}
                        disabled={savedIndexes.has(i)}
                      >
                        <Save className="h-3.5 w-3.5" /> {savedIndexes.has(i) ? 'Guardada' : 'Guardar como nota'}
                      </Button>
                      <button
                        onClick={() => setDismissedIndexes((prev) => new Set(prev).add(i))}
                        className="flex items-center gap-1 text-xs text-muted hover:text-brick-light"
                      >
                        <XIcon className="h-3.5 w-3.5" /> Descartar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
