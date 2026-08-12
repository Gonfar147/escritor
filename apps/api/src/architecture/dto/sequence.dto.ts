import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const ARCHITECTURE_STATUSES = ['IDEA', 'PLANNING', 'IN_PROGRESS', 'DRAFT', 'REVISED', 'DONE'] as const;
export type ArchitectureStatusValue = (typeof ARCHITECTURE_STATUSES)[number];

export class CreateSequenceDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateSequenceDto {
  @IsOptional()
  @IsString()
  title?: string;

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
  beginning?: string;

  @IsOptional()
  @IsString()
  ending?: string;

  @IsOptional()
  @IsString()
  consequences?: string;

  @IsOptional()
  @IsIn(ARCHITECTURE_STATUSES)
  planningStatus?: ArchitectureStatusValue;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReorderSequencesDto {
  @IsString({ each: true })
  orderedIds: string[];
}

export class MoveSequenceDto {
  /** Nueva parte destino */
  @IsString()
  targetPartId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
