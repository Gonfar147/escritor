import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { CreateSequenceDto, UpdateSequenceDto, ReorderSequencesDto, MoveSequenceDto } from './dto/sequence.dto';

@Injectable()
export class SequencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async create(userId: string, partId: string, dto: CreateSequenceDto) {
    const projectId = await this.access.projectIdForPart(partId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const order = dto.order ?? (await this.prisma.sequence.count({ where: { partId } }));
    return this.prisma.sequence.create({ data: { partId, title: dto.title, order } });
  }

  async findAll(userId: string, partId: string) {
    const projectId = await this.access.projectIdForPart(partId);
    await this.access.assertMember(userId, projectId);
    return this.prisma.sequence.findMany({
      where: { partId },
      orderBy: { order: 'asc' },
      include: { chapters: { orderBy: { order: 'asc' }, select: { id: true, title: true, status: true, order: true } } },
    });
  }

  async update(userId: string, sequenceId: string, dto: UpdateSequenceDto) {
    const projectId = await this.access.projectIdForSequence(sequenceId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.sequence.update({ where: { id: sequenceId }, data: dto as any });
  }

  /**
   * Elimina la secuencia. Los capítulos que colgaban de ella NO se borran —
   * quedan directamente bajo el Part (sequenceId pasa a null vía onDelete: SetNull
   * en el schema), consistente con que la capa Sequence es opcional.
   */
  async remove(userId: string, sequenceId: string) {
    const projectId = await this.access.projectIdForSequence(sequenceId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.sequence.delete({ where: { id: sequenceId } });
  }

  async reorder(userId: string, partId: string, dto: ReorderSequencesDto) {
    const projectId = await this.access.projectIdForPart(partId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) => this.prisma.sequence.update({ where: { id }, data: { order: index } })),
    );
    return this.findAll(userId, partId);
  }

  /** Mueve una secuencia (con todos sus capítulos) a otra Parte. */
  async move(userId: string, sequenceId: string, dto: MoveSequenceDto) {
    const projectId = await this.access.projectIdForSequence(sequenceId);
    const targetProjectId = await this.access.projectIdForPart(dto.targetPartId);
    if (projectId !== targetProjectId) {
      throw new BadRequestException('No se puede mover una secuencia entre proyectos distintos');
    }
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const order = dto.order ?? (await this.prisma.sequence.count({ where: { partId: dto.targetPartId } }));
    return this.prisma.sequence.update({ where: { id: sequenceId }, data: { partId: dto.targetPartId, order } });
  }

  /** Desengancha un capítulo de su secuencia (vuelve a colgar directo del Part). */
  async detachChapter(userId: string, chapterId: string) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.chapter.update({ where: { id: chapterId }, data: { sequenceId: null } });
  }

  /** Engancha un capítulo existente a una secuencia (debe ser del mismo Part). */
  async attachChapter(userId: string, chapterId: string, sequenceId: string) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    const sequenceProjectId = await this.access.projectIdForSequence(sequenceId);
    if (projectId !== sequenceProjectId) {
      throw new BadRequestException('El capítulo y la secuencia deben ser del mismo proyecto');
    }
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const sequence = await this.prisma.sequence.findUnique({ where: { id: sequenceId } });
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!sequence || !chapter) throw new NotFoundException('Secuencia o capítulo no encontrado');
    if (sequence.partId !== chapter.partId) {
      throw new BadRequestException('La secuencia debe pertenecer a la misma Parte que el capítulo');
    }

    return this.prisma.chapter.update({ where: { id: chapterId }, data: { sequenceId } });
  }
}
