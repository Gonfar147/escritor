import { IsOptional, IsString } from 'class-validator';

export class CreateEventCausalityDto {
  @IsString()
  fromEventId: string;

  @IsString()
  toEventId: string;

  @IsOptional()
  @IsString()
  description?: string;
}
