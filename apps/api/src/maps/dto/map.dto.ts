import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MapType } from '@prisma/client';

// ---- MapAsset ----

export class CreateMapDto {
  @IsString()
  title: string;

  @IsOptional() @IsEnum(MapType)
  mapType?: MapType;

  @IsString()
  imageUrl: string;

  @IsOptional() @IsInt() @Min(1)
  width?: number;

  @IsOptional() @IsInt() @Min(1)
  height?: number;

  @IsOptional() @IsString()
  parentMapId?: string;
}

export class UpdateMapDto extends PartialType(CreateMapDto) {}

// ---- MapPin ----

export class CreatePinDto {
  @IsNumber() @Min(0) @Max(1)
  x: number;

  @IsNumber() @Min(0) @Max(1)
  y: number;

  @IsOptional() @IsString()
  label?: string;

  @IsOptional() @IsString()
  locationId?: string;

  @IsOptional() @IsString()
  characterId?: string;
}

export class UpdatePinDto extends PartialType(CreatePinDto) {}

// ---- CharacterMovement ----

export class CreateMovementDto {
  @IsString()
  characterId: string;

  @IsNumber() @Min(0) @Max(1)
  x: number;

  @IsNumber() @Min(0) @Max(1)
  y: number;

  @IsOptional() @IsString()
  note?: string;

  @IsOptional() @IsString()
  sceneId?: string;

  @IsOptional() @IsString()
  eventId?: string;
}
