import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

const PROPOSAL_STATUSES = ['ACCEPTED', 'REJECTED', 'MODIFIED'] as const;

export class ResolveProposalDto {
  @IsIn(PROPOSAL_STATUSES)
  status: (typeof PROPOSAL_STATUSES)[number];

  /**
   * Solo para ACCEPTED/MODIFIED. Si no se manda, se aplica `content` (la propuesta
   * original de la IA) tal cual. Si se manda, es lo que el autor terminó aceptando
   * después de editar la propuesta — se aplica esto, pero `content` original queda
   * intacto en la tabla para poder comparar después.
   */
  @IsOptional()
  @IsObject()
  appliedContent?: Record<string, unknown>;
}

export class ConstructWithAiDto {
  @IsString()
  prompt: string; // ideas sueltas del autor, en lenguaje natural
}
