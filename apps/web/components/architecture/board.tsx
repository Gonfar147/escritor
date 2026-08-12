'use client';

import { useState } from 'react';
import { Plus, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { Part, Chapter } from '@/types/api';
import { StatusBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Selection } from './inspector-panel';

type Level = 'acts' | 'sequences' | 'chapters' | 'scenes';

export function ArchitectureBoard({
  projectId,
  parts,
  level,
  selection,
  onSelect,
  onReload,
}: {
  projectId: string;
  parts: Part[];
  level: Level;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  onReload: () => void;
}) {
  if (parts.length === 0) {
    return <EmptyBoard projectId={projectId} onReload={onReload} />;
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-2">
      {parts.map((part) => (
        <PartColumn key={part.id} part={part} level={level} selection={selection} onSelect={onSelect} onReload={onReload} />
      ))}
      <NewPartButton projectId={projectId} onReload={onReload} />
    </div>
  );
}

function PartColumn({
  part,
  level,
  selection,
  onSelect,
  onReload,
}: {
  part: Part;
  level: Level;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  onReload: () => void;
}) {
  const allChapters = [...part.chapters, ...(part.sequences ?? []).flatMap((s) => s.chapters)];
  const totalChapters = allChapters.length;
  const isSelected = selection?.type === 'part' && selection.data.id === part.id;

  async function addChapter() {
    await api.post(`/parts/${part.id}/chapters`, { title: 'Nuevo capítulo' });
    onReload();
  }

  async function addSequence() {
    await api.post(`/parts/${part.id}/sequences`, { title: 'Nueva secuencia' });
    onReload();
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-ink-800 bg-ink-900">
      <button
        onClick={() => onSelect({ type: 'part', data: part })}
        className={cn(
          'flex flex-col gap-1 rounded-t-lg border-b border-ink-800 px-3 py-3 text-left',
          isSelected && 'bg-ink-800',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-brass">{part.label}</span>
          {part.planningStatus && <StatusBadge status={part.planningStatus} />}
        </div>
        <span className="font-display text-sm text-ink_text">{part.title}</span>
        <span className="text-xs text-muted">{totalChapters} capítulo{totalChapters === 1 ? '' : 's'}</span>
      </button>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {level === 'sequences' && (part.sequences ?? []).length === 0 && part.chapters.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted">Sin secuencias todavía</p>
        )}

        {(level === 'sequences' || level === 'chapters' || level === 'scenes') &&
          (part.sequences ?? []).map((seq) => (
            <div key={seq.id} className="rounded-md border border-ink-800">
              <button
                onClick={() => onSelect({ type: 'sequence', data: seq })}
                className={cn(
                  'flex w-full items-center justify-between px-2.5 py-2 text-left text-xs',
                  selection?.type === 'sequence' && selection.data.id === seq.id && 'bg-ink-800',
                )}
              >
                <span className="text-ink_text">{seq.title}</span>
                {seq.planningStatus && <StatusBadge status={seq.planningStatus} />}
              </button>
              {(level === 'chapters' || level === 'scenes') && (
                <div className="space-y-1 border-t border-ink-800 p-1.5">
                  {seq.chapters.map((ch) => (
                    <ChapterRow key={ch.id} chapter={ch} level={level} selection={selection} onSelect={onSelect} />
                  ))}
                  <AddChapterButton onClick={async () => {
                    await api.post(`/parts/${part.id}/chapters`, { title: 'Nuevo capítulo', sequenceId: seq.id });
                    onReload();
                  }} />
                </div>
              )}
            </div>
          ))}

        {(level === 'chapters' || level === 'scenes') &&
          part.chapters.map((ch) => (
            <ChapterRow key={ch.id} chapter={ch} level={level} selection={selection} onSelect={onSelect} />
          ))}

        {level === 'acts' && totalChapters === 0 && (
          <p className="px-2 py-3 text-center text-xs text-muted">Sin capítulos todavía</p>
        )}
      </div>

      <div className="flex gap-1 border-t border-ink-800 p-2">
        <button onClick={addChapter} className="flex flex-1 items-center justify-center gap-1 rounded-sm py-1.5 text-xs text-muted hover:bg-ink-800 hover:text-ink_text">
          <Plus className="h-3.5 w-3.5" /> Capítulo
        </button>
        <button onClick={addSequence} className="flex flex-1 items-center justify-center gap-1 rounded-sm py-1.5 text-xs text-muted hover:bg-ink-800 hover:text-ink_text">
          <Plus className="h-3.5 w-3.5" /> Secuencia
        </button>
      </div>
    </div>
  );
}

function ChapterRow({
  chapter,
  level,
  selection,
  onSelect,
}: {
  chapter: Chapter;
  level: Level;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
}) {
  const [open, setOpen] = useState(false);
  const isSelected = selection?.type === 'chapter' && selection.data.id === chapter.id;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-sm px-1.5 py-1.5 text-xs',
          isSelected ? 'bg-ink-800' : 'hover:bg-ink-800/60',
        )}
      >
        {level === 'scenes' && (
          <button onClick={() => setOpen((o) => !o)} className="text-muted">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        )}
        <button onClick={() => onSelect({ type: 'chapter', data: chapter })} className="flex-1 truncate text-left text-ink_text">
          {chapter.title}
        </button>
        <StatusBadge status={chapter.status} />
      </div>
      {level === 'scenes' && open && (
        <div className="ml-4 space-y-0.5 border-l border-ink-800 pl-2">
          {chapter.scenes.map((sc) => (
            <button
              key={sc.id}
              onClick={() => onSelect({ type: 'scene', data: sc, chapterId: chapter.id })}
              className={cn(
                'flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-[11px]',
                selection?.type === 'scene' && selection.data.id === sc.id ? 'bg-ink-800 text-ink_text' : 'text-muted hover:text-ink_text',
              )}
            >
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{sc.title}</span>
            </button>
          ))}
          {chapter.scenes.length === 0 && <p className="py-1 text-[11px] text-muted">Sin escenas</p>}
        </div>
      )}
    </div>
  );
}

function AddChapterButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-center gap-1 rounded-sm py-1 text-[11px] text-muted hover:bg-ink-800 hover:text-ink_text">
      <Plus className="h-3 w-3" /> Capítulo
    </button>
  );
}

function NewPartButton({ projectId, onReload }: { projectId: string; onReload: () => void }) {
  async function create() {
    await api.post(`/projects/${projectId}/parts`, { title: 'Nueva parte' });
    onReload();
  }

  return (
    <button
      onClick={create}
      className="flex w-72 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink-700 text-muted hover:border-brass/50 hover:text-ink_text"
    >
      <Plus className="h-5 w-5" />
      <span className="text-sm">Agregar parte</span>
    </button>
  );
}

function EmptyBoard({ projectId, onReload }: { projectId: string; onReload: () => void }) {
  async function create() {
    await api.post(`/projects/${projectId}/parts`, { title: 'Acto I' });
    onReload();
  }

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="font-display text-lg text-ink_text">Todavía no has construido la arquitectura de esta novela</p>
      <p className="mt-1 max-w-sm text-sm text-muted">Comenzá desde donde quieras: una Parte, un capítulo, o dejá que la IA te proponga algo.</p>
      <button onClick={create} className="mt-4 flex items-center gap-2 rounded-md bg-brass px-4 py-2 text-sm font-medium text-ink-950 hover:bg-brass-light">
        <Plus className="h-4 w-4" /> Crear primera parte
      </button>
    </div>
  );
}
