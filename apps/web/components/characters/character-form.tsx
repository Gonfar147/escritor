'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Trash2, Skull } from 'lucide-react';
import { api } from '@/lib/api';
import { Character, CharacterStatus } from '@/types/api';
import { Input, Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { TagInput } from '@/components/ui/tag-input';
import { Button } from '@/components/ui/button';

const STATUS_LABELS: Record<CharacterStatus, string> = {
  ALIVE: 'Vivo',
  DEAD: 'Muerto',
  MISSING: 'Desaparecido',
  UNKNOWN: 'Desconocido',
};

export function CharacterForm({
  character,
  onDeleted,
  onSaved,
}: {
  character: Character;
  onDeleted: () => void;
  onSaved: (c: Character) => void;
}) {
  const [form, setForm] = useState(character);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setForm(character), [character]);

  function update<K extends keyof Character>(key: K, value: Character[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    setSaveState('idle');
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => save(next), 900);
  }

  async function save(next: Character) {
    setSaveState('saving');
    try {
      const updated = await api.patch<Character>(`/characters/${character.id}`, {
        name: next.name,
        aliases: next.aliases,
        age: next.age,
        pronouns: next.pronouns,
        profession: next.profession,
        appearance: next.appearance,
        photoUrl: next.photoUrl,
        colors: next.colors,
        symbols: next.symbols,
        virtues: next.virtues,
        flaws: next.flaws,
        traumas: next.traumas,
        goals: next.goals,
        motivations: next.motivations,
        fears: next.fears,
        conflicts: next.conflicts,
        arc: next.arc,
        secrets: next.secrets,
        lies: next.lies,
        typicalPhrases: next.typicalPhrases,
        status: next.status,
      });
      onSaved(updated);
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }

  async function remove() {
    if (!confirm(`¿Eliminar a ${form.name}? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/characters/${character.id}`);
    onDeleted();
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {form.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-800 font-display text-xl text-muted">
              {form.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="border-none bg-transparent p-0 font-display text-2xl text-ink_text focus-visible:outline-none"
              style={{ height: 'auto' }}
            />
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <SaveIndicator state={saveState} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {form.status === 'DEAD' && (
            <span className="flex items-center gap-1 rounded-sm bg-brick/15 px-2 py-1 text-xs text-brick-light">
              <Skull className="h-3 w-3" /> Muerto
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={remove}>
            <Trash2 className="h-3.5 w-3.5 text-muted hover:text-brick-light" />
          </Button>
        </div>
      </div>

      <Section title="Información general">
        <Row>
          <Field label="Alias">
            <TagInput value={form.aliases} onChange={(v) => update('aliases', v)} placeholder="Agregar alias…" />
          </Field>
        </Row>
        <Row cols={3}>
          <Field label="Edad">
            <Input type="number" value={form.age ?? ''} onChange={(e) => update('age', e.target.value ? Number(e.target.value) : null)} />
          </Field>
          <Field label="Pronombres">
            <Input value={form.pronouns ?? ''} onChange={(e) => update('pronouns', e.target.value)} />
          </Field>
          <Field label="Estado">
            <Select value={form.status} onChange={(e) => update('status', e.target.value as CharacterStatus)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </Field>
        </Row>
        <Row>
          <Field label="Profesión">
            <Input value={form.profession ?? ''} onChange={(e) => update('profession', e.target.value)} />
          </Field>
        </Row>
      </Section>

      <Section title="Apariencia">
        <Row>
          <Field label="Descripción física">
            <Textarea rows={3} value={form.appearance ?? ''} onChange={(e) => update('appearance', e.target.value)} />
          </Field>
        </Row>
        <Row cols={2}>
          <Field label="Colores asociados">
            <TagInput value={form.colors} onChange={(v) => update('colors', v)} placeholder="Agregar color…" />
          </Field>
          <Field label="Símbolos">
            <TagInput value={form.symbols} onChange={(v) => update('symbols', v)} placeholder="Agregar símbolo…" />
          </Field>
        </Row>
      </Section>

      <Section title="Personalidad y arco narrativo">
        <Row cols={2}>
          <Field label="Virtudes">
            <TagInput value={form.virtues} onChange={(v) => update('virtues', v)} placeholder="Agregar virtud…" />
          </Field>
          <Field label="Defectos">
            <TagInput value={form.flaws} onChange={(v) => update('flaws', v)} placeholder="Agregar defecto…" />
          </Field>
        </Row>
        <Row cols={2}>
          <Field label="Objetivos"><Textarea rows={2} value={form.goals ?? ''} onChange={(e) => update('goals', e.target.value)} /></Field>
          <Field label="Motivaciones"><Textarea rows={2} value={form.motivations ?? ''} onChange={(e) => update('motivations', e.target.value)} /></Field>
        </Row>
        <Row cols={2}>
          <Field label="Miedos"><Textarea rows={2} value={form.fears ?? ''} onChange={(e) => update('fears', e.target.value)} /></Field>
          <Field label="Conflictos"><Textarea rows={2} value={form.conflicts ?? ''} onChange={(e) => update('conflicts', e.target.value)} /></Field>
        </Row>
        <Row>
          <Field label="Arco narrativo"><Textarea rows={3} value={form.arc ?? ''} onChange={(e) => update('arc', e.target.value)} /></Field>
        </Row>
        <Row cols={2}>
          <Field label="Secretos"><Textarea rows={2} value={form.secrets ?? ''} onChange={(e) => update('secrets', e.target.value)} /></Field>
          <Field label="Mentiras"><Textarea rows={2} value={form.lies ?? ''} onChange={(e) => update('lies', e.target.value)} /></Field>
        </Row>
        <Row>
          <Field label="Frases típicas">
            <TagInput value={form.typicalPhrases} onChange={(v) => update('typicalPhrases', v)} placeholder="Agregar frase…" />
          </Field>
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 border-t border-ink-800 pt-6 first:border-t-0 first:pt-0">
      <h3 className="mb-4 font-display text-sm uppercase tracking-wider text-brass-light">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ children, cols = 1 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  const colClass = cols === 3 ? 'sm:grid-cols-3' : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1';
  return <div className={`grid grid-cols-1 gap-4 ${colClass}`}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'saving') return <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</span>;
  if (state === 'saved') return <span className="flex items-center gap-1 text-verdigris-light"><Check className="h-3 w-3" /> Guardado</span>;
  return <span>&nbsp;</span>;
}
