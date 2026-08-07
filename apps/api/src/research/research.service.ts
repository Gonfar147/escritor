import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { ResearchItemType } from '@prisma/client';
import { CreateResearchItemDto, UpdateResearchItemDto } from './dto/research-item.dto';

@Injectable()
export class ResearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateResearchItemDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.researchItem.create({ data: { ...dto, projectId } });
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
    return this.prisma.researchItem.update({ where: { id: itemId }, data: dto });
  }

  async remove(userId: string, itemId: string) {
    const item = await this.requireItem(itemId);
    await this.access.assertRole(userId, item.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.researchItem.delete({ where: { id: itemId } });
  }

  private async requireItem(itemId: string) {
    const item = await this.prisma.researchItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Elemento de investigación no encontrado');
    return item;
  }
}
