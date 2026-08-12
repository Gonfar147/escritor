'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Send, Trash2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { ChatConversation, ChatConversationSummary, ChatMessage } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function ChatPanel({ projectId }: { projectId: string }) {
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadConversations(selectFirst = false) {
    const list = await api.get<ChatConversationSummary[]>(`/projects/${projectId}/ai/chat/conversations`);
    setConversations(list);
    if (selectFirst && list[0]) openConversation(list[0].id);
  }

  useEffect(() => {
    loadConversations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function openConversation(id: string) {
    setActiveId(id);
    const conv = await api.get<ChatConversation>(`/ai/chat/conversations/${id}`);
    setMessages(conv.messages);
  }

  async function newConversation() {
    const conv = await api.post<ChatConversationSummary>(`/projects/${projectId}/ai/chat/conversations`, {});
    await loadConversations();
    setActiveId(conv.id);
    setMessages([]);
  }

  async function deleteConversation(id: string) {
    await api.delete(`/ai/chat/conversations/${id}`);
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
    loadConversations();
  }

  async function send() {
    const content = input.trim();
    if (!content || sending) return;

    let conversationId = activeId;
    if (!conversationId) {
      const conv = await api.post<ChatConversationSummary>(`/projects/${projectId}/ai/chat/conversations`, {});
      conversationId = conv.id;
      setActiveId(conv.id);
    }

    setInput('');
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: 'pending-user', conversationId: conversationId!, role: 'USER', content, createdAt: new Date().toISOString() },
    ]);

    try {
      const result = await api.post<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>(
        `/ai/chat/conversations/${conversationId}/messages`,
        { content },
      );
      setMessages((prev) => [...prev.filter((m) => m.id !== 'pending-user'), result.userMessage, result.assistantMessage]);
      loadConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== 'pending-user'));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="grid h-full grid-cols-[200px_1fr] overflow-hidden rounded-lg border border-ink-800">
      {/* Historial de conversaciones */}
      <div className="flex flex-col border-r border-ink-800 bg-ink-900">
        <button
          onClick={newConversation}
          className="flex items-center gap-2 border-b border-ink-800 px-3 py-3 text-sm text-brass-light hover:bg-ink-800"
        >
          <Plus className="h-4 w-4" /> Nuevo chat
        </button>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                'group flex items-center justify-between gap-1 px-3 py-2.5 text-sm cursor-pointer',
                c.id === activeId ? 'bg-ink-800 text-ink_text' : 'text-muted hover:bg-ink-800/60',
              )}
              onClick={() => openConversation(c.id)}
            >
              <span className="truncate">{c.title || 'Conversación sin título'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(c.id);
                }}
                className="hidden shrink-0 text-muted hover:text-brick-light group-hover:block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Hilo de mensajes */}
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted">
              <Sparkles className="mb-3 h-7 w-7 text-brass" strokeWidth={1.5} />
              <p className="font-display text-lg text-ink_text">Preguntale a tu novela</p>
              <p className="mt-1 max-w-sm text-sm">
                El asistente responde usando lo que ya escribiste: personajes, lugares, mundo, línea temporal y escenas.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn('flex', m.role === 'USER' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap',
                  m.role === 'USER' ? 'bg-brass text-ink-950' : 'bg-ink-800 text-ink_text',
                )}
              >
                {m.content}
                {m.role === 'ASSISTANT' && m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 border-t border-ink-700 pt-2">
                    {m.sources.map((s, i) => (
                      <span key={i} className="rounded-sm bg-ink-900 px-1.5 py-0.5 text-[11px] text-muted">
                        {s.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && <div className="text-sm text-muted">Pensando…</div>}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 border-t border-ink-800 p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Preguntá algo sobre tu novela…"
            className="min-h-[44px] resize-none"
            rows={1}
          />
          <Button onClick={send} disabled={sending || !input.trim()} size="md">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
