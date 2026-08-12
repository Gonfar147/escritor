import { IsOptional, IsString } from 'class-validator';

export class LinkChapterCharacterDto {
  @IsString()
  characterId: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class LinkChapterLocationDto {
  @IsString()
  locationId: string;
}
