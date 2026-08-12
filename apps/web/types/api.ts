export interface Project {
  id: string;
  title: string;
  subtitle?: string | null;
  coverUrl?: string | null;
  genre?: string | null;
  status: 'DRAFT' | 'IN_PROGRESS' | 'REVISION' | 'COMPLETED' | 'PUBLISHED' | 'ARCHIVED';
  synopsis?: string | null;
  wordGoal?: number | null;
  color?: string | null;
  icon?: string | null;
  updatedAt: string;
}

export interface Part {
  id: string;
  projectId: string;
  title: string;
  order: number;
  label: string;
  narrativeFunction?: string | null;
  objective?: string | null;
  conflict?: string | null;
  planningStatus?: ArchitectureStatus | null;
  notes?: string | null;
  chapters: Chapter[];
  sequences?: Sequence[];
}

export interface Sequence {
  id: string;
  partId: string;
  title: string;
  order: number;
  narrativeFunction?: string | null;
  objective?: string | null;
  conflict?: string | null;
  beginning?: string | null;
  ending?: string | null;
  consequences?: string | null;
  planningStatus?: ArchitectureStatus | null;
  notes?: string | null;
  chapters: Chapter[];
}

export interface ChapterSummary {
  id: string;
  title: string;
  order: number;
  status: SceneStatus;
}

export interface Chapter {
  id: string;
  partId: string;
  sequenceId?: string | null;
  title: string;
  order: number;
  status: SceneStatus;
  narrativeFunction?: string | null;
  objective?: string | null;
  conflict?: string | null;
  change?: string | null;
  infoToReveal?: string | null;
  infoToProtect?: string | null;
  hook?: string | null;
  notes?: string | null;
  scenes: SceneSummary[];
}

export type ArchitectureStatus = 'IDEA' | 'PLANNING' | 'IN_PROGRESS' | 'DRAFT' | 'REVISED' | 'DONE';

export type SceneStatus = 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface SceneSummary {
  id: string;
  title: string;
  order: number;
  wordCount: number;
  status: SceneStatus;
  objective?: string | null;
  conflict?: string | null;
  emotionalChange?: string | null;
  infoRevealed?: string | null;
  infoProtected?: string | null;
  transition?: string | null;
  notes?: string | null;
}

export interface Scene extends SceneSummary {
  chapterId: string;
  content: unknown; // documento Tiptap JSON
}

// ---- Personajes ----

export type CharacterStatus = 'ALIVE' | 'DEAD' | 'MISSING' | 'UNKNOWN';

export interface Character {
  id: string;
  projectId: string;
  name: string;
  aliases: string[];
  age?: number | null;
  birthDate?: string | null;
  sex?: string | null;
  pronouns?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  profession?: string | null;
  appearance?: string | null;
  photoUrl?: string | null;
  inspiration?: string | null;
  colors: string[];
  symbols: string[];
  virtues: string[];
  flaws: string[];
  traumas?: string | null;
  goals?: string | null;
  motivations?: string | null;
  fears?: string | null;
  conflicts?: string | null;
  arc?: string | null;
  secrets?: string | null;
  lies?: string | null;
  typicalPhrases: string[];
  status: CharacterStatus;
  updatedAt: string;
}

export type CharacterRelationType = 'FAMILY' | 'ALLY' | 'ENEMY' | 'MENTOR' | 'PARTNER' | 'OTHER';

export interface CharacterRelationship {
  id: string;
  relatedCharacter: { id: string; name: string; photoUrl?: string | null };
  type: CharacterRelationType;
  description?: string | null;
}

// ---- Lugares ----

export interface Location {
  id: string;
  projectId: string;
  name: string;
  history?: string | null;
  geography?: string | null;
  climate?: string | null;
  photos: string[];
  maps: string[];
  notes?: string | null;
  updatedAt: string;
}

// ---- Objetos ----

export interface StoryObject {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  history?: string | null;
  importance?: string | null;
  ownerCharacterId?: string | null;
  locationId?: string | null;
  updatedAt: string;
}

// ---- World Building ----

export type WorldCategory =
  | 'COUNTRY' | 'CITY' | 'CULTURE' | 'ECONOMY' | 'RELIGION' | 'HISTORY_EVENT'
  | 'RACE' | 'CREATURE' | 'LANGUAGE' | 'POLITICS' | 'TECHNOLOGY' | 'MAGIC_SYSTEM'
  | 'CALENDAR' | 'CURRENCY' | 'LAW' | 'ORGANIZATION' | 'OTHER';

export interface WorldEntry {
  id: string;
  projectId: string;
  category: WorldCategory;
  title: string;
  summary?: string | null;
  content: unknown;
  coverImage?: string | null;
  tags: string[];
  parentId?: string | null;
  updatedAt: string;
}

// ---- Timeline ----

export type TimelineEventType = 'GENERIC' | 'BIRTH' | 'DEATH' | 'BATTLE' | 'MEETING' | 'TRAVEL' | 'DISCOVERY' | 'OTHER';

export interface TimelineEvent {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  eventType: TimelineEventType;
  displayDate?: string | null;
  date?: string | null;
  sortKey: number;
  durationMinutes?: number | null;
  locationId?: string | null;
  location?: { id: string; name: string } | null;
  characters: { characterId: string; role?: string | null; character: { id: string; name: string; photoUrl?: string | null } }[];
}

export interface TimelineInconsistency {
  type: string;
  message: string;
  eventIds: string[];
}

// ---- Mapas ----

export type MapType = 'WORLD' | 'REGION' | 'CITY' | 'BUILDING' | 'OTHER';

export interface MapAsset {
  id: string;
  projectId: string;
  title: string;
  mapType: MapType;
  imageUrl: string;
  width?: number | null;
  height?: number | null;
  parentMapId?: string | null;
}

export interface MapPin {
  id: string;
  mapId: string;
  x: number;
  y: number;
  label?: string | null;
  locationId?: string | null;
  characterId?: string | null;
  location?: { id: string; name: string } | null;
  character?: { id: string; name: string; photoUrl?: string | null } | null;
}

// ---- Investigación ----

export type ResearchItemType = 'PDF' | 'WORD' | 'EXCEL' | 'AUDIO' | 'VIDEO' | 'IMAGE' | 'LINK' | 'NOTE' | 'CLIPPING' | 'OTHER';
export type OcrStatus = 'NONE' | 'PENDING' | 'DONE' | 'FAILED';
export type TranscriptionStatus = 'NONE' | 'PENDING' | 'DONE' | 'FAILED';

export interface ResearchItem {
  id: string;
  projectId: string;
  title: string;
  type: ResearchItemType;
  fileUrl?: string | null;
  linkUrl?: string | null;
  content?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  tags: string[];
  ocrStatus: OcrStatus;
  transcriptionStatus: TranscriptionStatus;
  updatedAt: string;
}

// ---- Módulo 12 — IA ----

export type EmbeddingEntityType =
  | 'SCENE' | 'CHARACTER' | 'LOCATION' | 'OBJECT' | 'WORLD_ENTRY' | 'TIMELINE_EVENT' | 'RESEARCH_ITEM' | 'NOTE';

export type ChatRole = 'USER' | 'ASSISTANT';

export interface ChatSource {
  entityType: EmbeddingEntityType;
  entityId: string;
  title: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  sources?: ChatSource[] | null;
  createdAt: string;
}

export interface ChatConversationSummary {
  id: string;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatConversation extends ChatConversationSummary {
  projectId: string;
  userId: string;
  messages: ChatMessage[];
}

export type BrainstormKind = 'PLOT' | 'DIALOGUE' | 'CHARACTER' | 'SCENE_IDEA' | 'TWIST' | 'OTHER';

export interface ForgottenCharacter {
  id: string;
  name: string;
  status: CharacterStatus;
  sceneCount: number;
  scenesSinceLastAppearance: number | null;
  lastAppearance: { sceneId: string; sceneTitle: string } | null;
}

// ---- Módulo 13 — Arquitectura Narrativa ----

export interface NovelVision {
  id: string;
  projectId: string;
  premise?: string | null;
  centralTheme?: string | null;
  centralQuestion?: string | null;
  centralConflict?: string | null;
  protagonistCharacterId?: string | null;
  mainGoal?: string | null;
  antagonism?: string | null;
  worldNotes?: string | null;
  expectedEnding?: string | null;
  generalNotes?: string | null;
}

export interface CharacterArc {
  id: string;
  characterId: string;
  initialState?: string | null;
  turningPoint?: string | null;
  transformation?: string | null;
  finalState?: string | null;
  resolution?: string | null;
  notes?: string | null;
}

export interface EventCausality {
  id: string;
  fromEventId: string;
  toEventId: string;
  description?: string | null;
  fromEvent: { id: string; title: string; sortKey: number };
  toEvent: { id: string; title: string; sortKey: number };
}

export type AiProposalType =
  | 'FULL_STRUCTURE' | 'ACT_STRUCTURE' | 'SEQUENCE' | 'CHAPTER'
  | 'CHARACTER_ARC' | 'COHERENCE_ANALYSIS' | 'STRUCTURE_DISCOVERY' | 'REORGANIZATION'
  | 'NOTE_CONNECT' | 'NOTE_GENERATE_IDEAS' | 'NOTE_DEEPEN' | 'NOTE_FIND_CONFLICTS'
  | 'NOTE_BUILD' | 'NOTE_FIND_CONTRADICTIONS' | 'NOTE_QUERY' | 'OTHER';

export type AiProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MODIFIED';

export interface AiProposal {
  id: string;
  projectId: string;
  type: AiProposalType;
  status: AiProposalStatus;
  content: any;
  appliedContent?: any;
  contextSummary?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

// Formas de `AiProposal.content`, según el `type` — ver proposal-content.types.ts en el backend
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
  sequences?: ProposedSequence[];
  chapters?: ProposedChapter[];
}
export interface StructureProposalContent {
  actLabel?: string;
  reasoning?: string;
  acts: ProposedAct[];
}

export interface DiscoveredAct {
  title: string;
  narrativeFunction?: string;
  objective?: string;
  conflict?: string;
  sequences?: Array<{ title: string; narrativeFunction?: string; objective?: string; chapterIds: string[] }>;
  chapterIds?: string[];
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

// ---- Módulo 14 — Notas ----

export type NoteStatus = 'IDEA' | 'EXPLORING' | 'DEVELOPED' | 'INCORPORATED' | 'DISCARDED';

export type NoteRelationEntityType =
  | 'CHARACTER' | 'PART' | 'SEQUENCE' | 'CHAPTER' | 'SCENE' | 'LOCATION' | 'TIMELINE_EVENT';

export interface NoteGroup {
  id: string;
  projectId: string;
  name: string;
  color?: string | null;
  archived: boolean;
  order: number;
  _count?: { notes: number };
}

export interface NoteTagRef {
  tag: { id: string; name: string; color?: string | null };
}

export interface NoteRelation {
  id: string;
  entityType: NoteRelationEntityType;
  entityId: string;
}

export interface Note {
  id: string;
  projectId: string;
  title?: string | null;
  content: string;
  status: NoteStatus;
  groupId?: string | null;
  group?: { id: string; name: string; color?: string | null } | null;
  noteTags: NoteTagRef[];
  relations: NoteRelation[];
  aiOriginProposalId?: string | null;
  aiSourceNoteIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Los 6 modos de "Pensar con estas notas" — QUERY es aparte (usa una pregunta, no una selección).
export type NoteAiMode = 'CONNECT' | 'GENERATE_IDEAS' | 'DEEPEN' | 'FIND_CONFLICTS' | 'BUILD' | 'FIND_CONTRADICTIONS';

export interface NoteInsight {
  title: string;
  body: string;
}

// content de un AiProposal de tipo NOTE_* (salvo NOTE_QUERY, ver abajo)
export interface NoteThinkContent {
  insights: NoteInsight[];
  sourceNoteIds: string[];
}

// content de un AiProposal de tipo NOTE_QUERY
export interface NoteQueryContent {
  question: string;
  answer: string;
  sourceNoteIds: string[];
}

