import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

const ARCHITECTURE_STATUSES = ['IDEA', 'PLANNING', 'IN_PROGRESS', 'DRAFT', 'REVISED', 'DONE'] as const;

export class CreatePartDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  label?: string; // "Acto", "Bloque", "Sección"... por defecto "Parte"
}

export class UpdatePartDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  label?: string;

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
  @IsIn(ARCHITECTURE_STATUSES)
  planningStatus?: (typeof ARCHITECTURE_STATUSES)[number];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReorderDto {
  /** IDs en el nuevo orden deseado, de principio a fin */
  @IsString({ each: true })
  orderedIds: string[];
}
