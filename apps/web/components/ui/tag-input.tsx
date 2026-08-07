'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit() {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 focus-within:border-brass">
      {value.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-sm bg-ink-800 px-2 py-0.5 text-xs text-ink_text"
        >
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Quitar ${tag}`}>
            <X className="h-3 w-3 text-muted hover:text-brick-light" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="min-w-[6ch] flex-1 bg-transparent text-sm text-ink_text placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
