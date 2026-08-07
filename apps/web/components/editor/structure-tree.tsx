'use client';

import { useState } from 'react';
import { ChevronRight, Plus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Part, SceneSummary } from '@/types/api';

const STATUS_DOT: Record<string, string> = {
  DRAFT: 'bg-ink-600',
  IN_PROGRESS: 'bg-brass',
  REVIEW: 'bg-verdigris',
  DONE: 'bg-verdigris-light',
};

export function StructureTree({
  parts,
  selectedSceneId,
  onSelectScene,
  onAddPart,
  onAddChapter,
  onAddScene,
}: {
  parts: Part[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string, chapterId: string) => void;
  onAddPart: () => void;
  onAddChapter: (partId: string) => void;
  onAddScene: (chapterId: string) => void;
}) {
  return (
    <div className="flex h-full flex-col border-r border-ink-800 bg-ink-900">
      {/* La "franja de lomo" — rebordes horizontales sutiles, referencia al lomo de un libro físico */}
      <div
        className="flex-1 overflow-y-auto py-3"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(184,148,79,0.06) 27px, rgba(184,148,79,0.06) 28px)',
        }}
      >
        {parts.map((part) => (
          <PartRow
            key={part.id}
            part={part}
            selectedSceneId={selectedSceneId}
            onSelectScene={onSelectScene}
            onAddChapter={onAddChapter}
            onAddScene={onAddScene}
          />
        ))}
      </div>

      <button
        onClick={onAddPart}
        className="flex items-center gap-1.5 border-t border-ink-800 px-4 py-3 text-sm text-muted hover:text-brass-light"
      >
        <Plus className="h-3.5 w-3.5" /> Nueva parte
      </button>
    </div>
  );
}

function PartRow({
  part,
  selectedSceneId,
  onSelectScene,
  onAddChapter,
  onAddScene,
}: {
  part: Part;
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string, chapterId: string) => void;
  onAddChapter: (partId: string) => void;
  onAddScene: (chapterId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wider text-muted hover:text-ink_text"
      >
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
        {part.title}
      </button>

      {open && (
        <div className="ml-2">
          {part.chapters.map((chapter) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              selectedSceneId={selectedSceneId}
              onSelectScene={onSelectScene}
              onAddScene={onAddScene}
            />
          ))}
          <button
            onClick={() => onAddChapter(part.id)}
            className="ml-4 flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-brass-light"
          >
            <Plus className="h-3 w-3" /> Capítulo
          </button>
        </div>
      )}
    </div>
  );
}

function ChapterRow({
  chapter,
  selectedSceneId,
  onSelectScene,
  onAddScene,
}: {
  chapter: Part['chapters'][number];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string, chapterId: string) => void;
  onAddScene: (chapterId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const totalWords = chapter.scenes.reduce((sum: number, s: SceneSummary) => sum + s.wordCount, 0);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm text-ink_text/90 hover:text-ink_text"
      >
        <ChevronRight className={cn('h-3 w-3 shrink-0 text-muted transition-transform', open && 'rotate-90')} />
        <span className="truncate">{chapter.title}</span>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">{totalWords}</span>
      </button>

      {open && (
        <div className="ml-2">
          {chapter.scenes.map((scene: SceneSummary) => (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id, chapter.id)}
              className={cn(
                'group flex w-full items-center gap-2 rounded-sm px-3 py-1.5 pl-8 text-left text-sm transition-colors',
                selectedSceneId === scene.id
                  ? 'bg-brass/10 text-brass-light shadow-spine'
                  : 'text-muted hover:bg-ink-800 hover:text-ink_text',
              )}
              style={selectedSceneId === scene.id ? ({ '--tw-shadow-color': '#B8944F' } as React.CSSProperties) : undefined}
            >
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[scene.status])} />
              <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="truncate">{scene.title}</span>
              <span className="ml-auto shrink-0 font-mono text-[11px] opacity-60">{scene.wordCount}</span>
            </button>
          ))}
          <button
            onClick={() => onAddScene(chapter.id)}
            className="ml-8 flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-brass-light"
          >
            <Plus className="h-3 w-3" /> Escena
          </button>
        </div>
      )}
    </div>
  );
}
