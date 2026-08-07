import { PartialType } from '@nestjs/mapped-types';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TimelineEventType } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsEnum(TimelineEventType)
  eventType?: TimelineEventType;

  @IsOptional() @IsString()
  displayDate?: string;

  @IsOptional() @IsDateString()
  date?: string;

  /** Si se omite, el evento se agrega al final del orden cronológico actual */
  @IsOptional() @IsInt()
  sortKey?: number;

  @IsOptional() @IsInt() @Min(0)
  durationMinutes?: number;

  @IsOptional() @IsString()
  locationId?: string;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class ReorderEventsDto {
  @IsString({ each: true })
  orderedIds: string[];
}

export class LinkCharacterDto {
  @IsString()
  characterId: string;

  @IsOptional() @IsString()
  role?: string;
}

export class LinkSceneDto {
  @IsString()
  sceneId: string;
}
