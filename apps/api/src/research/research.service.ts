import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { IndexingService } from '../indexing/indexing.service';
import { OcrService } from '../ocr/ocr.service';
import { TranscriptionService } from '../transcription/transcription.service';
import { ResearchItemType } from '@prisma/client';
import { CreateResearchItemDto, UpdateResearchItemDto } from './dto/research-item.dto';

const OCR_ELIGIBLE_TYPES: ResearchItemType[] = ['PDF', 'IMAGE'];
const TRANSCRIPTION_ELIGIBLE_TYPES: ResearchItemType[] = ['AUDIO', 'VIDEO'];

@Injectable()
export class ResearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly indexing: IndexingService,
    private readonly ocr: OcrService,
    private readonly transcription: TranscriptionService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateResearchItemDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    const item = await this.prisma.researchItem.create({ data: { ...dto, projectId } });

    if (item.content) {
      // Texto libre (NOTE/CLIPPING) o ya cargado a mano: se indexa directo.
      this.indexing.indexEntityAsync(projectId, 'RESEARCH_ITEM', item.id, item.title, item.content);
    } else if (OCR_ELIGIBLE_TYPES.includes(item.type) && item.fileUrl) {
      // PDF/IMAGE sin texto todavía: se dispara OCR en background; el propio
      // OcrService indexa el resultado cuando termina.
      this.ocr.processAsync(item.id);
    } else if (TRANSCRIPTION_ELIGIBLE_TYPES.includes(item.type) && item.fileUrl) {
      this.transcription.processAsync(item.id);
    }
    return item;
  }

  async findAll(
    userId: string,
    projectId: string,
    filters: { type?: ResearchItemType; tag?: string; search?: string },
  ) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.researchItem.findMany({
      where: {
        projectId,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.tag ? { tags: { has: filters.tag } } : {}),
        ...(filters.search
          ? {
              OR: [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { content: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Todas las etiquetas usadas en el proyecto, para armar filtros rápidos en el frontend */
  async listTags(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);
    const items = await this.prisma.researchItem.findMany({
      where: { projectId },
      select: { tags: true },
    });
    return [...new Set(items.flatMap((i) => i.tags))].sort();
  }

  async findOne(userId: string, itemId: string) {
    const item = await this.requireItem(itemId);
    await this.access.assertMember(userId, item.projectId);
    return item;
  }

  async update(userId: string, itemId: string, dto: UpdateResearchItemDto) {
    const item = await this.requireItem(itemId);
    await this.access.assertRole(userId, item.projectId, ProjectAccessService.WRITE_ROLES);
    const updated = await this.prisma.researchItem.update({ where: { id: itemId }, data: dto });

    const fileChanged = dto.fileUrl !== undefined && dto.fileUrl !== item.fileUrl;
    if (dto.content !== undefined && updated.content) {
      // El usuario editó el texto a mano (ej. corrigió un OCR/transcripción): se respeta e indexa tal cual.
      this.indexing.indexEntityAsync(item.projectId, 'RESEARCH_ITEM', updated.id, updated.title, updated.content);
    } else if (fileChanged && OCR_ELIGIBLE_TYPES.includes(updated.type) && updated.fileUrl) {
      this.ocr.processAsync(updated.id);
    } else if (fileChanged && TRANSCRIPTION_ELIGIBLE_TYPES.includes(updated.type) && updated.fileUrl) {
      this.transcription.processAsync(updated.id);
    } else if (updated.content) {
      this.indexing.indexEntityAsync(item.projectId, 'RESEARCH_ITEM', updated.id, updated.title, updated.content);
    } else {
      this.indexing.removeEntityAsync('RESEARCH_ITEM', updated.id);
    }
    return updated;
  }

  /** Vuelve a correr OCR manualmente (ej. si falló, o si se quiere reintentar tras subir un archivo mejor escaneado). */
  async rerunOcr(userId: string, itemId: string) {
    const item = await this.requireItem(itemId);
    await this.access.assertRole(userId, item.projectId, ProjectAccessService.WRITE_ROLES);
    if (!OCR_ELIGIBLE_TYPES.includes(item.type) || !item.fileUrl) {
      throw new NotFoundException('Este elemento no tiene un archivo PDF/imagen para procesar con OCR');
    }
    this.ocr.processAsync(item.id);
    return { status: 'PENDING' };
  }

  /** Vuelve a correr la transcripción manualmente. */
  async rerunTranscription(userId: string, itemId: string) {
    const item = await this.requireItem(itemId);
    await this.access.assertRole(userId, item.projectId, ProjectAccessService.WRITE_ROLES);
    if (!TRANSCRIPTION_ELIGIBLE_TYPES.includes(item.type) || !item.fileUrl) {
      throw new NotFoundException('Este elemento no tiene un archivo de audio/video para transcribir');
    }
    this.transcription.processAsync(item.id);
    return { status: 'PENDING' };
  }

  async remove(userId: string, itemId: string) {
    const item = await this.requireItem(itemId);
    await this.access.assertRole(userId, item.projectId, ProjectAccessService.WRITE_ROLES);
    const removed = await this.prisma.researchItem.delete({ where: { id: itemId } });
    this.indexing.removeEntityAsync('RESEARCH_ITEM', itemId);
    return removed;
  }

  private async requireItem(itemId: string) {
    const item = await this.prisma.researchItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Elemento de investigación no encontrado');
    return item;
  }
}
