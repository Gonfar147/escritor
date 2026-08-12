import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const NOTE_STATUSES = ['IDEA', 'EXPLORING', 'DEVELOPED', 'INCORPORATED', 'DISCARDED'] as const;
const NOTE_RELATION_ENTITY_TYPES = [
  'CHARACTER',
  'PART',
  'SEQUENCE',
  'CHAPTER',
  'SCENE',
  'LOCATION',
  'TIMELINE_EVENT',
] as const;

// Los 6 modos de "Pensar con estas notas" (punto 14) — QUERY tiene su propio
// DTO/endpoint aparte porque no parte de una selección de notas sino de una pregunta.
export const NOTE_AI_MODES = [
  'CONNECT',
  'GENERATE_IDEAS',
  'DEEPEN',
  'FIND_CONFLICTS',
  'BUILD',
  'FIND_CONTRADICTIONS',
] as const;
export type NoteAiMode = (typeof NOTE_AI_MODES)[number];

/** Único campo obligatorio: la captura tiene que poder ser "+ Nueva nota → escribir → guardar" (punto 3). */
export class CreateNoteDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  /** Nombres de tag (no ids) — se resuelven contra los tags del proyecto, creando los que falten. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(NOTE_STATUSES)
  status?: (typeof NOTE_STATUSES)[number];
}

/** groupId: null mueve la nota de vuelta a la Bandeja; un id la asigna a ese grupo. */
export class MoveNoteDto {
  @IsOptional()
  groupId?: string | null;
}

/** Reemplaza el set completo de tags de la nota (no incremental). */
export class SetNoteTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

class NoteRelationInput {
  @IsIn(NOTE_RELATION_ENTITY_TYPES)
  entityType: (typeof NOTE_RELATION_ENTITY_TYPES)[number];

  @IsString()
  entityId: string;
}

/** Reemplaza el set completo de relaciones de la nota (no incremental). */
export class SetNoteRelationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteRelationInput)
  relations: NoteRelationInput[];
}

export class CreateNoteGroupDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateNoteGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  archived?: boolean;
}

/** "Pensar con estas notas" (punto 13): la IA recibe exclusivamente estas notas + contexto mínimo. */
export class ThinkWithNotesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  noteIds: string[];

  @IsIn(NOTE_AI_MODES)
  mode: NoteAiMode;
}

/** "Consultar mis ideas" (punto 19): búsqueda semántica sobre las notas del proyecto. */
export class QueryIdeasDto {
  @IsString()
  @MinLength(1)
  question: string;
}

/** "Guardar como nota" (punto 17) sobre una tarjeta de resultado de IA puntual. */
export class SaveInsightAsNoteDto {
  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsString()
  title?: string;
}
