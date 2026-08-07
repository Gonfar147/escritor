import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { WorldCategory } from '@prisma/client';

export class CreateWorldEntryDto {
  @IsEnum(WorldCategory)
  category: WorldCategory;

  @IsString()
  title: string;

  @IsOptional() @IsString()
  summary?: string;

  @IsOptional()
  content?: unknown; // documento Tiptap JSON

  @IsOptional() @IsString()
  coverImage?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @IsString()
  parentId?: string;
}

export class UpdateWorldEntryDto extends PartialType(CreateWorldEntryDto) {}

export class CreateWorldEntryLinkDto {
  @IsString()
  toId: string;

  @IsOptional() @IsString()
  relation?: string;
}
