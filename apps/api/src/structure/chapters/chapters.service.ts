import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectAccessService } from '../../common/project-access.service';
import {
  CreateChapterDto,
  UpdateChapterDto,
  ReorderChaptersDto,
  MoveChapterDto,
  MergeChaptersDto,
} from './dto/chapter.dto';

@Injectable()
export class ChaptersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async create(userId: string, partId: string, dto: CreateChapterDto) {
    const projectId = await this.access.projectIdForPart(partId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const order = dto.order ?? (await this.prisma.chapter.count({ where: { partId } }));

    return this.prisma.chapter.create({ data: { partId, title: dto.title, order, sequenceId: dto.sequenceId } });
  }

  async findAll(userId: string, partId: string) {
    const projectId = await this.access.projectIdForPart(partId);
    await this.access.assertMember(userId, projectId);
    return this.prisma.chapter.findMany({
      where: { partId },
      orderBy: { order: 'asc' },
      include: { scenes: { orderBy: { order: 'asc' }, select: { id: true, title: true, wordCount: true, status: true, order: true } } },
    });
  }

  async findOne(userId: string, chapterId: string) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertMember(userId, projectId);
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        scenes: { orderBy: { order: 'asc' } },
        characterLinks: true,
        locationLinks: true,
      },
    });
    if (!chapter) throw new NotFoundException('Capítulo no encontrado');
    return chapter;
  }

  async update(userId: string, chapterId: string, dto: UpdateChapterDto) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.chapter.update({ where: { id: chapterId }, data: dto as any });
  }

  async remove(userId: string, chapterId: string) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.chapter.delete({ where: { id: chapterId } });
  }

  async reorder(userId: string, partId: string, dto: ReorderChaptersDto) {
    const projectId = await this.access.projectIdForPart(partId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.chapter.update({ where: { id }, data: { order: index } }),
      ),
    );
    return this.findAll(userId, partId);
  }

  /** Mueve un capítulo (con todas sus escenas) a otra parte, incluso de otro punto del libro */
  async move(userId: string, chapterId: string, dto: MoveChapterDto) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    const targetProjectId = await this.access.projectIdForPart(dto.targetPartId);

    if (projectId !== targetProjectId) {
      throw new BadRequestException('No se puede mover un capítulo entre proyectos distintos');
    }
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const order = dto.order ?? (await this.prisma.chapter.count({ where: { partId: dto.targetPartId } }));

    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: { partId: dto.targetPartId, order },
    });
  }

  /** Duplica un capítulo completo, incluyendo todas sus escenas y su contenido */
  async duplicate(userId: string, chapterId: string) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const original = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { scenes: { orderBy: { order: 'asc' } } },
    });
    if (!original) throw new NotFoundException('Capítulo no encontrado');

    const siblingCount = await this.prisma.chapter.count({ where: { partId: original.partId } });

    return this.prisma.chapter.create({
      data: {
        partId: original.partId,
        title: `${original.title} (copia)`,
        order: siblingCount,
        status: 'DRAFT',
        scenes: {
          create: original.scenes.map((s) => ({
            title: s.title,
            order: s.order,
            content: s.content as any,
            wordCount: s.wordCount,
            status: 'DRAFT',
          })),
        },
      },
      include: { scenes: true },
    });
  }

  /**
   * Fusiona varios capítulos en uno: concatena sus escenas (re-numerando el orden)
   * bajo el primer capítulo de la lista, y elimina el resto.
   */
  async merge(userId: string, dto: MergeChaptersDto) {
    if (dto.chapterIds.length < 2) {
      throw new BadRequestException('Se necesitan al menos 2 capítulos para fusionar');
    }

    const chapters = await this.prisma.chapter.findMany({
      where: { id: { in: dto.chapterIds } },
      include: { scenes: true },
    });
    if (chapters.length !== dto.chapterIds.length) {
      throw new NotFoundException('Alguno de los capítulos no existe');
    }

    const projectId = await this.access.projectIdForChapter(chapters[0].id);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    // Ordenamos los capítulos según el orden pedido por el usuario, no el de la DB
    const orderedChapters = dto.chapterIds.map((id) => chapters.find((c) => c.id === id)!);
    const [target, ...toMerge] = orderedChapters;

    let nextOrder = target.scenes.length;

    return this.prisma.$transaction(async (tx) => {
      for (const chapter of toMerge) {
        for (const scene of chapter.scenes.sort((a, b) => a.order - b.order)) {
          await tx.scene.update({
            where: { id: scene.id },
            data: { chapterId: target.id, order: nextOrder++ },
          });
        }
        await tx.chapter.delete({ where: { id: chapter.id } });
      }

      if (dto.newTitle) {
        await tx.chapter.update({ where: { id: target.id }, data: { title: dto.newTitle } });
      }

      return tx.chapter.findUnique({
        where: { id: target.id },
        include: { scenes: { orderBy: { order: 'asc' } } },
      });
    });
  }
}
