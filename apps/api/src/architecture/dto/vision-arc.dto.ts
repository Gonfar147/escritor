import { IsOptional, IsString } from 'class-validator';

export class UpsertVisionDto {
  @IsOptional()
  @IsString()
  premise?: string;

  @IsOptional()
  @IsString()
  centralTheme?: string;

  @IsOptional()
  @IsString()
  centralQuestion?: string;

  @IsOptional()
  @IsString()
  centralConflict?: string;

  @IsOptional()
  @IsString()
  protagonistCharacterId?: string | null;

  @IsOptional()
  @IsString()
  mainGoal?: string;

  @IsOptional()
  @IsString()
  antagonism?: string;

  @IsOptional()
  @IsString()
  worldNotes?: string;

  @IsOptional()
  @IsString()
  expectedEnding?: string;

  @IsOptional()
  @IsString()
  generalNotes?: string;
}

export class UpsertCharacterArcDto {
  @IsOptional()
  @IsString()
  initialState?: string;

  @IsOptional()
  @IsString()
  turningPoint?: string;

  @IsOptional()
  @IsString()
  transformation?: string;

  @IsOptional()
  @IsString()
  finalState?: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
