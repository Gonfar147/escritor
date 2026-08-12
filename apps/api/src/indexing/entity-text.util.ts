/** Arma el texto a indexar para un Character a partir de sus campos de ficha. */
export function characterIndexText(c: {
  aliases: string[];
  profession?: string | null;
  appearance?: string | null;
  virtues: string[];
  flaws: string[];
  traumas?: string | null;
  goals?: string | null;
  motivations?: string | null;
  fears?: string | null;
  conflicts?: string | null;
  arc?: string | null;
  secrets?: string | null;
}): string {
  return [
    c.aliases.length ? `También conocido como: ${c.aliases.join(', ')}.` : '',
    c.profession ? `Profesión: ${c.profession}.` : '',
    c.appearance ? `Apariencia: ${c.appearance}` : '',
    c.virtues.length ? `Virtudes: ${c.virtues.join(', ')}.` : '',
    c.flaws.length ? `Defectos: ${c.flaws.join(', ')}.` : '',
    c.traumas ? `Traumas: ${c.traumas}` : '',
    c.goals ? `Objetivos: ${c.goals}` : '',
    c.motivations ? `Motivaciones: ${c.motivations}` : '',
    c.fears ? `Miedos: ${c.fears}` : '',
    c.conflicts ? `Conflictos: ${c.conflicts}` : '',
    c.arc ? `Arco narrativo: ${c.arc}` : '',
    c.secrets ? `Secretos: ${c.secrets}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Arma el texto a indexar para una Location. */
export function locationIndexText(l: {
  history?: string | null;
  geography?: string | null;
  climate?: string | null;
  notes?: string | null;
}): string {
  return [
    l.history ? `Historia: ${l.history}` : '',
    l.geography ? `Geografía: ${l.geography}` : '',
    l.climate ? `Clima: ${l.climate}` : '',
    l.notes ? `Notas: ${l.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Arma el texto a indexar para un StoryObject. */
export function objectIndexText(o: {
  description?: string | null;
  history?: string | null;
  importance?: string | null;
}): string {
  return [
    o.description ? `Descripción: ${o.description}` : '',
    o.history ? `Historia: ${o.history}` : '',
    o.importance ? `Importancia: ${o.importance}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
