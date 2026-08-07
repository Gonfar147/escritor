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
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  partId: string;
  title: string;
  order: number;
  status: SceneStatus;
  scenes: SceneSummary[];
}

export type SceneStatus = 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface SceneSummary {
  id: string;
  title: string;
  order: number;
  wordCount: number;
  status: SceneStatus;
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

export interface ResearchItem {
  id: string;
  projectId: string;
  title: string;
  type: ResearchItemType;
  fileUrl?: string | null;
  linkUrl?: string | null;
  content?: string | null;
  tags: string[];
  updatedAt: string;
}
