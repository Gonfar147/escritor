import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  history?: string;

  @IsOptional() @IsString()
  geography?: string;

  @IsOptional() @IsString()
  climate?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  photos?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  maps?: string[];

  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}

export class LinkSceneDto {
  @IsString()
  sceneId: string;
}
