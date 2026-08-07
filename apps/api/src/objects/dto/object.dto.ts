import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';

export class CreateObjectDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  history?: string;

  @IsOptional() @IsString()
  importance?: string;

  @IsOptional() @IsString()
  ownerCharacterId?: string;

  @IsOptional() @IsString()
  locationId?: string;
}

export class UpdateObjectDto extends PartialType(CreateObjectDto) {}

export class LinkSceneDto {
  @IsString()
  sceneId: string;
}
