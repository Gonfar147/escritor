/**
 * Contrato del JSON que vive en `AiProposal.content` (y opcionalmente en
 * `appliedContent`). Lo respeta tanto quien genera la propuesta (ArchitectureAiService,
 * ArchitectureAnalysisService) como quien la aplica (AiProposalsService.apply*).
 */

export interface ProposedChapter {
  title: string;
  narrativeFunction?: string;
  objective?: string;
  conflict?: string;
  change?: string;
  infoToReveal?: string;
  infoToProtect?: string;
  hook?: string;
}

export interface ProposedSequence {
  title: string;
  narrativeFunction?: string;
  objective?: string;
  chapters: ProposedChapter[];
}

export interface ProposedAct {
  title: string;
  narrativeFunction?: string;
  objective?: string;
  conflict?: string;
  /** Un acto usa secuencias O capítulos directos, no necesariamente ambos. */
  sequences?: ProposedSequence[];
  chapters?: ProposedChapter[];
}

/** Contenido de propuestas FULL_STRUCTURE: estructura completamente nueva, arrancando de cero. */
export interface StructureProposalContent {
  actLabel?: string; // cómo llamar al nivel superior: "Acto", "Parte", "Bloque"... default "Acto"
  reasoning?: string; // el "¿Por qué esta estructura?" que pide el punto 19
  acts: ProposedAct[];
}

/**
 * Contenido de propuesta STRUCTURE_DISCOVERY ("Analizar estructura existente", punto 20):
 * a diferencia de FULL_STRUCTURE, NO crea capítulos nuevos — organiza los capítulos que
 * YA EXISTEN (referenciados por id) dentro de Actos/Secuencias nuevos, y opcionalmente
 * sugiere valores para los campos de ficha que el capítulo todavía no tiene completos
 * (nunca pisa un campo que el autor ya haya escrito).
 */
export interface DiscoveredAct {
  title: string;
  narrativeFunction?: string;
  objective?: string;
  conflict?: string;
  sequences?: Array<{ title: string; narrativeFunction?: string; objective?: string; chapterIds: string[] }>;
  chapterIds?: string[]; // capítulos que van directo en el acto, sin pasar por una secuencia
}

export interface ChapterFieldSuggestion {
  chapterId: string;
  narrativeFunction?: string;
  objective?: string;
  conflict?: string;
  change?: string;
  hook?: string;
}

export interface StructureDiscoveryContent {
  actLabel?: string;
  reasoning?: string;
  acts: DiscoveredAct[];
  chapterFieldSuggestions?: ChapterFieldSuggestion[];
}

/** Contenido de propuesta ACT_STRUCTURE: un único acto nuevo. */
export interface ActProposalContent {
  reasoning?: string;
  act: ProposedAct;
}

/** Contenido de propuesta SEQUENCE: una secuencia nueva, para agregar a un Part existente. */
export interface SequenceProposalContent {
  partId: string;
  reasoning?: string;
  sequence: ProposedSequence;
}

/** Contenido de propuesta CHAPTER: un capítulo nuevo, para agregar a un Part (y opcionalmente Sequence) existente. */
export interface ChapterProposalContent {
  partId: string;
  sequenceId?: string;
  reasoning?: string;
  chapter: ProposedChapter;
}

/** Contenido de propuesta CHARACTER_ARC: arco estructurado sugerido para un personaje existente. */
export interface CharacterArcProposalContent {
  characterId: string;
  reasoning?: string;
  arc: {
    initialState?: string;
    turningPoint?: string;
    transformation?: string;
    finalState?: string;
    resolution?: string;
  };
}

/** Contenido de propuesta REORGANIZATION: mover capítulos existentes de lugar. */
export interface ReorganizationProposalContent {
  reasoning?: string;
  moves: Array<{
    chapterId: string;
    targetPartId: string;
    targetSequenceId?: string | null;
    order?: number;
  }>;
}

/** Contenido de propuesta COHERENCE_ANALYSIS: hallazgos del "Ver análisis" (punto 18). No se "aplica" — es informativa. */
export interface CoherenceFinding {
  severity: 'info' | 'warning' | 'issue';
  title: string;
  explanation: string;
  suggestion?: string;
  relatedEntity?: { type: string; id: string; title: string };
}
export interface CoherenceAnalysisContent {
  findings: CoherenceFinding[];
  summary?: string;
}
