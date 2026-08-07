import { IsIn, IsString, MaxLength } from 'class-validator';

const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

export class PresignedUrlDto {
  @IsString()
  projectId: string;

  @IsString()
  @MaxLength(255)
  filename: string;

  @IsIn(ALLOWED_CONTENT_TYPES, {
    message: 'Tipo de archivo no permitido',
  })
  contentType: string;
}

export { ALLOWED_CONTENT_TYPES };
