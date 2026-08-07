import { IsArray, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSceneDto {
  @IsString()
  title: string;

  @IsOptional()
  content?: unknown; // documento Tiptap JSON

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateSceneDto {
  @IsOptional()
  @IsString()
  title?: string;

  /** Documento Tiptap completo — llega en cada autoguardado */
  @IsOptional()
  content?: unknown;

  @IsOptional()
  @IsIn(['DRAFT', 'IN_PROGRESS', 'REVIEW', 'DONE'])
  status?: 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
}

export class ReorderScenesDto {
  @IsString({ each: true })
  orderedIds: string[];
}

export class MoveSceneDto {
  @IsString()
  targetChapterId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class MergeScenesDto {
  @IsArray()
  @IsString({ each: true })
  sceneIds: string[];

  @IsOptional()
  @IsString()
  newTitle?: string;
}

export class SplitSceneDto {
  /**
   * Índice del nodo de nivel superior del documento Tiptap donde se corta:
   * todo lo anterior a este índice queda en la escena original,
   * el resto pasa a la escena nueva.
   */
  @IsInt()
  @Min(1)
  splitAtNodeIndex: number;

  @IsOptional()
  @IsString()
  newSceneTitle?: string;
}
