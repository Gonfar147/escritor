'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Part, SceneSummary } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ChatPanel } from '@/components/ai/chat-panel';
import { WritingToolsPanel } from '@/components/ai/writing-tools-panel';
import { ForgottenCharactersWidget } from '@/components/ai/forgotten-characters-widget';

export default function AiPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [scenes, setScenes] = useState<SceneSummary[]>([]);
  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    api.get<Part[]>(`/projects/${projectId}/parts`).then((parts) => {
      setScenes(parts.flatMap((p) => p.chapters.flatMap((c) => c.scenes)));
    });
  }, [projectId]);

  async function reindex() {
    setReindexing(true);
    try {
      await api.post(`/projects/${projectId}/ai/reindex`);
    } finally {
      setReindexing(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-ink_text">Asistente IA</h1>
          <p className="text-sm text-muted">Chateá sobre tu novela y usá herramientas de escritura, ancladas en tu propio codex.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={reindex} disabled={reindexing}>
          <RefreshCw className={reindexing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          {reindexing ? 'Reindexando…' : 'Reindexar proyecto'}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-4">
        <ChatPanel projectId={projectId} />
        <div className="flex flex-col gap-4 overflow-y-auto">
          <WritingToolsPanel projectId={projectId} scenes={scenes} />
          <ForgottenCharactersWidget projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
