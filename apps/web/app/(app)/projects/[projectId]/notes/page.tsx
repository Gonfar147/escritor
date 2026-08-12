'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, Plus, X as XIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { NoteGroupsSidebar } from '@/components/notes/note-groups-sidebar';
import { NoteCard } from '@/components/notes/note-card';
import { NoteDetailPanel } from '@/components/notes/note-detail-panel';
import { NotesSelectionBar } from '@/components/notes/notes-selection-bar';
import { ThinkWithNotesPanel } from '@/components/notes/think-with-notes-panel';
import { QueryIdeasPanel } from '@/components/notes/query-ideas-panel';
import { Note, NoteGroup, NoteStatus } from '@/types/api';

const STATUS_FILTERS: { value: NoteStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'IDEA', label: '💭 Idea' },
  { value: 'EXPLORING', label: '🔎 Explorando' },
  { value: 'DEVELOPED', label: '💡 Desarrollada' },
  { value: 'INCORPORATED', label: '📌 Incorporada' },
  { value: 'DISCARDED', label: '🗑️ Descartada' },
];

export default function NotesPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [allNotesCount, setAllNotesCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null | 'unorganized'>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<NoteStatus | ''>('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openNote, setOpenNote] = useState<Note | null>(null);
  const [thinkOpen, setThinkOpen] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  const loadGroups = useCallback(async () => {
    const data = await api.get<NoteGroup[]>(`/projects/${projectId}/note-groups`);
    setGroups(data);
  }, [projectId]);

  const loadNotes = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedGroupId === 'unorganized') params.set('groupId', 'unorganized');
    else if (selectedGroupId) params.set('groupId', selectedGroupId);
    if (statusFilter) params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());

    const data = await api.get<Note[]>(`/projects/${projectId}/notes?${params.toString()}`);
    setNotes(data);
    setLoaded(true);
  }, [projectId, selectedGroupId, statusFilter, search]);

  const loadCounts = useCallback(async () => {
    const [all, inbox] = await Promise.all([
      api.get<Note[]>(`/projects/${projectId}/notes`),
      api.get<Note[]>(`/projects/${projectId}/notes?groupId=unorganized`),
    ]);
    setAllNotesCount(all.length);
    setInboxCount(inbox.length);
  }, [projectId]);

  useEffect(() => {
    loadGroups();
    loadCounts();
  }, [loadGroups, loadCounts]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  function refreshAll() {
    loadNotes();
    loadGroups();
    loadCounts();
  }

  async function createNote() {
    const content = draft.trim();
    if (!content) {
      setCreating(false);
      return;
    }
    await api.post<Note>(`/projects/${projectId}/notes`, {
      content,
      groupId: selectedGroupId && selectedGroupId !== 'unorganized' ? selectedGroupId : undefined,
    });
    setDraft('');
    setCreating(false);
    refreshAll();
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const selectedNotes = useMemo(() => notes.filter((n) => selectedIds.has(n.id)), [notes, selectedIds]);

  async function openNoteDetail(note: Note) {
    const full = await api.get<Note>(`/notes/${note.id}`);
    setOpenNote(full);
  }

  function onNoteUpdated(updated: Note) {
    setOpenNote(updated);
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  }

  function onNoteDeleted(id: string) {
    setOpenNote(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    refreshAll();
  }

  function onNoteCreatedFromAi(note: Note) {
    refreshAll();
  }

  const showEmptyState = loaded && allNotesCount === 0 && !creating;

  return (
    <div className="grid h-full grid-cols-[240px_1fr]">
      <NoteGroupsSidebar
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={(id) => {
          setSelectedGroupId(id);
          setSelectedIds(new Set());
        }}
        onCreateGroup={async (name) => {
          await api.post(`/projects/${projectId}/note-groups`, { name });
          loadGroups();
        }}
        onRenameGroup={async (id, name) => {
          await api.put(`/note-groups/${id}`, { name });
          loadGroups();
        }}
        onArchiveGroup={async (id) => {
          await api.put(`/note-groups/${id}`, { archived: true });
          loadGroups();
        }}
        onDeleteGroup={async (id) => {
          await api.delete(`/note-groups/${id}`);
          if (selectedGroupId === id) setSelectedGroupId(null);
          refreshAll();
        }}
        totalCount={allNotesCount}
        inboxCount={inboxCount}
      />

      <div className="flex h-full min-w-0">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-ink-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl text-ink_text">Notas</h1>
                <p className="text-sm text-muted">Tu espacio para capturar y desarrollar ideas.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setQueryOpen(true)}>
                  🔎 Consultar mis ideas
                </Button>
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Nueva nota
                </Button>
              </div>
            </div>

            {!showEmptyState && (
              <div className="mt-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar notas…"
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as NoteStatus | '')} className="w-48">
                  {STATUS_FILTERS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {creating && (
              <div className="mb-4 rounded-md border border-brass/40 bg-ink-900 p-3">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) createNote();
                    if (e.key === 'Escape') {
                      setDraft('');
                      setCreating(false);
                    }
                  }}
                  placeholder="¿Y si…? También podés simplemente escribir una idea y organizarla después."
                  rows={3}
                  className="w-full resize-none bg-transparent text-sm text-ink_text placeholder:text-muted focus:outline-none"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setDraft('');
                      setCreating(false);
                    }}
                    className="flex items-center gap-1 px-2 text-xs text-muted hover:text-ink_text"
                  >
                    <XIcon className="h-3 w-3" /> Cancelar
                  </button>
                  <Button size="sm" onClick={createNote} disabled={!draft.trim()}>
                    Guardar nota
                  </Button>
                </div>
              </div>
            )}

            {showEmptyState ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <h2 className="font-display text-lg text-ink_text">Todavía no tenés notas</h2>
                <p className="max-w-sm text-sm text-muted">
                  Tu espacio para capturar ideas, pensamientos y posibilidades para tu novela.
                </p>
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" /> Nueva nota
                </Button>
                <p className="max-w-sm text-xs text-muted">También podés simplemente escribir una idea y organizarla después.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 pb-24 sm:grid-cols-2 xl:grid-cols-3">
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    selected={selectedIds.has(note.id)}
                    onToggleSelect={(checked) => toggleSelect(note.id, checked)}
                    onOpen={() => openNoteDetail(note)}
                  />
                ))}
                {notes.length === 0 && loaded && (
                  <p className="col-span-full py-10 text-center text-sm text-muted">
                    Ninguna nota coincide con estos filtros.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {openNote && (
          <NoteDetailPanel
            note={openNote}
            projectId={projectId}
            groups={groups}
            onClose={() => setOpenNote(null)}
            onUpdated={onNoteUpdated}
            onDeleted={onNoteDeleted}
          />
        )}
      </div>

      <NotesSelectionBar
        selectedNotes={selectedNotes}
        projectId={projectId}
        groups={groups}
        onClear={() => setSelectedIds(new Set())}
        onChanged={() => {
          setSelectedIds(new Set());
          refreshAll();
        }}
        onThink={() => setThinkOpen(true)}
      />

      <ThinkWithNotesPanel
        open={thinkOpen}
        onClose={() => setThinkOpen(false)}
        projectId={projectId}
        noteIds={Array.from(selectedIds)}
        onNoteCreated={onNoteCreatedFromAi}
      />

      <QueryIdeasPanel open={queryOpen} onClose={() => setQueryOpen(false)} projectId={projectId} />
    </div>
  );
}
