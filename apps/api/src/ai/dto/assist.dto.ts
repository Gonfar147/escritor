import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ContinueSceneDto {
  @IsString()
  sceneId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instruction?: string; // ej: "que aparezca un giro inesperado", "en tono más oscuro"
}

export class RewriteTextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(6000)
  text: string;

  @IsString()
  @MaxLength(500)
  instruction: string; // ej: "más tenso", "resumir a la mitad", "cambiar a primera persona"

  @IsOptional()
  @IsString()
  sceneId?: string; // opcional, para dar contexto del resto de la escena
}

export const BRAINSTORM_KINDS = ['PLOT', 'DIALOGUE', 'CHARACTER', 'SCENE_IDEA', 'TWIST', 'OTHER'] as const;
export type BrainstormKind = (typeof BRAINSTORM_KINDS)[number];

export class BrainstormDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  prompt: string;

  @IsIn(BRAINSTORM_KINDS)
  kind: BrainstormKind;

  @IsOptional()
  @IsString()
  sceneId?: string;
}

export const DESCRIBABLE_TYPES = ['CHARACTER', 'LOCATION', 'OBJECT'] as const;
export type DescribableType = (typeof DESCRIBABLE_TYPES)[number];

export class DescribeEntityDto {
  @IsIn(DESCRIBABLE_TYPES)
  entityType: DescribableType;

  @IsString()
  entityId: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  style?: string; // ej: "poético y breve", "técnico y directo"
}
