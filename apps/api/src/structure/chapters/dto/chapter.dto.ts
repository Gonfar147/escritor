import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateChapterDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  sequenceId?: string; // opcional: si no se manda, el capítulo cuelga directo de la Parte
}

export class UpdateChapterDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'IN_PROGRESS', 'REVIEW', 'DONE'])
  status?: 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

  @IsOptional()
  @IsString()
  sequenceId?: string | null; // null explícito para desvincular de la secuencia

  @IsOptional()
  @IsString()
  narrativeFunction?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  conflict?: string;

  @IsOptional()
  @IsString()
  change?: string;

  @IsOptional()
  @IsString()
  infoToReveal?: string;

  @IsOptional()
  @IsString()
  infoToProtect?: string;

  @IsOptional()
  @IsString()
  hook?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReorderChaptersDto {
  @IsString({ each: true })
  orderedIds: string[];
}

export class MoveChapterDto {
  /** Nueva parte destino */
  @IsString()
  targetPartId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class MergeChaptersDto {
  /** Capítulos a fusionar, en el orden en que se concatenan sus escenas */
  @IsArray()
  @IsString({ each: true })
  chapterIds: string[];

  @IsOptional()
  @IsString()
  newTitle?: string;
}
