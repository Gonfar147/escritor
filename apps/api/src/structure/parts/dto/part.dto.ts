import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePartDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdatePartDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class ReorderDto {
  /** IDs en el nuevo orden deseado, de principio a fin */
  @IsString({ each: true })
  orderedIds: string[];
}
