import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateIf,
} from 'class-validator';
import { ResearchItemType } from '@prisma/client';

export class CreateResearchItemDto {
  @IsString()
  title: string;

  @IsEnum(ResearchItemType)
  type: ResearchItemType;

  @ValidateIf((o) => !['LINK', 'NOTE', 'CLIPPING'].includes(o.type))
  @IsString()
  fileUrl?: string;

  @ValidateIf((o) => o.type === 'LINK')
  @IsUrl()
  linkUrl?: string;

  @ValidateIf((o) => ['NOTE', 'CLIPPING'].includes(o.type))
  @IsString()
  content?: string;

  @IsOptional() @IsString()
  mimeType?: string;

  @IsOptional() @IsInt() @Min(0)
  fileSizeBytes?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];
}

export class UpdateResearchItemDto extends PartialType(CreateResearchItemDto) {}
