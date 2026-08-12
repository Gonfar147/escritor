'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AiProposal, NoteQueryContent } from '@/types/api';

export function QueryIdeasPanel({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId: string }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<NoteQueryContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const proposal = await api.post<AiProposal>(`/projects/${projectId}/notes/query`, { question: question.trim() });
      setAnswer(proposal.content as NoteQueryContent);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo consultar tus ideas. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setQuestion('');
    setAnswer(null);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="🔎 Consultar mis ideas" className="max-w-xl">
      <p className="mb-3 text-sm text-muted">
        Preguntá algo sobre tu archivo de notas — la IA busca solo entre lo que ya escribiste, nunca inventa una nota que no existe.
      </p>
      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder="¿Tengo alguna idea relacionada con…?"
          autoFocus
        />
        <Button onClick={ask} disabled={loading || !question.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-brick-light">{error}</p>}

      {answer && (
        <div className="mt-4 rounded-md border border-ink-700 bg-ink-800 p-4">
          <p className="whitespace-pre-wrap text-sm text-ink_text/90">{answer.answer}</p>
          {answer.sourceNoteIds.length > 0 && (
            <p className="mt-3 text-xs text-muted">Basado en {answer.sourceNoteIds.length} nota(s) de tu archivo.</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
