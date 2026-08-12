import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { IndexingService } from '../indexing/indexing.service';
import { extractTextFromTiptapDoc } from '../indexing/text-chunking.util';
import { WorldCategory } from '@prisma/client';
import {
  CreateWorldEntryDto,
  UpdateWorldEntryDto,
  CreateWorldEntryLinkDto,
} from './dto/world-entry.dto';

@Injectable()
export class WorldBuildingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly indexing: IndexingService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateWorldEntryDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    const entry = await this.prisma.worldEntry.create({
      data: { ...dto, content: (dto.content ?? {}) as any, projectId },
    });
    this.indexWorldEntry(projectId, entry);
    return entry;
  }

  /** Lista, opcionalmente filtrada por categoría — así se arma cada pestaña de la wiki (Países, Razas, etc.) */
  async findAll(userId: string, projectId: string, category?: WorldCategory) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.worldEntry.findMany({
      where: { projectId, ...(category ? { category } : {}) },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        category: true,
        title: true,
        summary: true,
        coverImage: true,
        tags: true,
        parentId: true,
        updatedAt: true,
      },
    });
  }

  /** Estructura de árbol (para categorías jerárquicas como País > Ciudad) */
  async findTree(userId: string, projectId: string, category?: WorldCategory) {
    const entries = await this.findAll(userId, projectId, category);
    const byId = new Map(entries.map((e) => [e.id, { ...e, children: [] as any[] }]));
    const roots: any[] = [];

    for (const entry of byId.values()) {
      if (entry.parentId && byId.has(entry.parentId)) {
        byId.get(entry.parentId)!.children.push(entry);
      } else {
        roots.push(entry);
      }
    }
    return roots;
  }

  async findOne(userId: string, entryId: string) {
    const entry = await this.prisma.worldEntry.findUnique({
      where: { id: entryId },
      include: {
        parent: { select: { id: true, title: true, category: true } },
        children: { select: { id: true, title: true, category: true } },
        linksFrom: { include: { to: { select: { id: true, title: true, category: true } } } },
        linksTo: { include: { from: { select: { id: true, title: true, category: true } } } },
      },
    });
    if (!entry) throw new NotFoundException('Entrada no encontrada');
    await this.access.assertMember(userId, entry.projectId);
    return entry;
  }

  async update(userId: string, entryId: string, dto: UpdateWorldEntryDto) {
    const entry = await this.requireEntry(entryId);
    await this.access.assertRole(userId, entry.projectId, ProjectAccessService.WRITE_ROLES);

    if (dto.parentId === entryId) {
      throw new BadRequestException('Una entrada no puede ser padre de sí misma');
    }

    const updated = await this.prisma.worldEntry.update({
      where: { id: entryId },
      data: { ...dto, content: dto.content !== undefined ? (dto.content as any) : undefined },
    });
    this.indexWorldEntry(entry.projectId, updated);
    return updated;
  }

  async remove(userId: string, entryId: string) {
    const entry = await this.requireEntry(entryId);
    await this.access.assertRole(userId, entry.projectId, ProjectAccessService.WRITE_ROLES);
    const removed = await this.prisma.worldEntry.delete({ where: { id: entryId } });
    this.indexing.removeEntityAsync('WORLD_ENTRY', entryId);
    return removed;
  }

  private indexWorldEntry(projectId: string, entry: { id: string; title: string; summary: string | null; content: unknown }) {
    const text = [entry.summary ?? '', extractTextFromTiptapDoc(entry.content)].filter(Boolean).join('\n\n');
    this.indexing.indexEntityAsync(projectId, 'WORLD_ENTRY', entry.id, entry.title, text);
  }

  // ---- Enlaces cruzados tipo wiki ----

  async addLink(userId: string, entryId: string, dto: CreateWorldEntryLinkDto) {
    const entry = await this.requireEntry(entryId);
    await this.access.assertRole(userId, entry.projectId, ProjectAccessService.WRITE_ROLES);

    if (dto.toId === entryId) {
      throw new BadRequestException('Una entrada no puede enlazarse a sí misma');
    }

    return this.prisma.worldEntryLink.create({
      data: { fromId: entryId, toId: dto.toId, relation: dto.relation },
    });
  }

  async removeLink(userId: string, entryId: string, linkId: string) {
    const entry = await this.requireEntry(entryId);
    await this.access.assertRole(userId, entry.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.worldEntryLink.delete({ where: { id: linkId } });
  }

  private async requireEntry(entryId: string) {
    const entry = await this.prisma.worldEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entrada no encontrada');
    return entry;
  }
}
