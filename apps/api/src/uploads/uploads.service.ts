import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { ProjectAccessService } from '../common/project-access.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket = process.env.S3_BUCKET as string;

  constructor(private readonly access: ProjectAccessService) {
    this.s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY as string,
        secretAccessKey: process.env.S3_SECRET_KEY as string,
      },
      forcePathStyle: true, // requerido por MinIO
    });
  }

  /**
   * Devuelve una URL pre-firmada (PUT, expira en 5 min) para que el FRONTEND
   * suba el archivo directo a S3/MinIO — el archivo nunca pasa por este backend,
   * así no cargamos la API con binarios grandes de PDF/audio/video.
   */
  async createPresignedUploadUrl(userId: string, dto: PresignedUrlDto) {
    await this.access.assertRole(userId, dto.projectId, ProjectAccessService.WRITE_ROLES);

    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `projects/${dto.projectId}/${randomUUID()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });

    // URL pública final del archivo, una vez subido (asume bucket/proxy servido en S3_PUBLIC_URL)
    const publicBase = process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT;
    const fileUrl = `${publicBase}/${this.bucket}/${key}`;

    return { uploadUrl, fileUrl, key };
  }
}
