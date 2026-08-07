import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CharacterStatus, CharacterRelationType } from '@prisma/client';

export class CreateCharacterDto {
  @IsString()
  name: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  aliases?: string[];

  @IsOptional() @IsInt() @Min(0)
  age?: number;

  @IsOptional() @IsDateString()
  birthDate?: string;

  @IsOptional() @IsString()
  sex?: string;

  @IsOptional() @IsString()
  pronouns?: string;

  @IsOptional() @IsInt() @Min(0)
  heightCm?: number;

  @IsOptional() @IsInt() @Min(0)
  weightKg?: number;

  @IsOptional() @IsString()
  profession?: string;

  @IsOptional() @IsString()
  appearance?: string;

  @IsOptional() @IsString()
  photoUrl?: string;

  @IsOptional() @IsString()
  inspiration?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  colors?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  symbols?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  virtues?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  flaws?: string[];

  @IsOptional() @IsString()
  traumas?: string;

  @IsOptional() @IsString()
  goals?: string;

  @IsOptional() @IsString()
  motivations?: string;

  @IsOptional() @IsString()
  fears?: string;

  @IsOptional() @IsString()
  conflicts?: string;

  @IsOptional() @IsString()
  arc?: string;

  @IsOptional() @IsString()
  secrets?: string;

  @IsOptional() @IsString()
  lies?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  typicalPhrases?: string[];

  @IsOptional() @IsEnum(CharacterStatus)
  status?: CharacterStatus;
}

export class UpdateCharacterDto extends PartialType(CreateCharacterDto) {}

export class CreateCharacterRelationshipDto {
  @IsString()
  relatedCharacterId: string;

  @IsEnum(CharacterRelationType)
  type: CharacterRelationType;

  @IsOptional() @IsString()
  description?: string;
}

export class LinkSceneDto {
  @IsString()
  sceneId: string;
}
