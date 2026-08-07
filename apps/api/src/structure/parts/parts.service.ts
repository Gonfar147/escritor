import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectAccessService } from '../../common/project-access.service';
import { CreatePartDto, UpdatePartDto, ReorderDto } from './dto/part.dto';

@Injectable()
export class PartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async create(userId: string, projectId: string, dto: CreatePartDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const order = dto.order ?? (await this.prisma.part.count({ where: { projectId } }));

    return this.prisma.part.create({
      data: { projectId, title: dto.title, order },
    });
  }

  async findAll(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.part.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: { chapters: { orderBy: { order: 'asc' } } },
    });
  }

  async update(userId: string, partId: string, dto: UpdatePartDto) {
    const projectId = await this.access.projectIdForPart(partId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.part.update({ where: { id: partId }, data: dto });
  }

  async remove(userId: string, partId: string) {
    const projectId = await this.access.projectIdForPart(partId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.part.delete({ where: { id: partId } });
  }

  /** Reordena todas las partes de un proyecto de una sola vez (drag & drop en el frontend) */
  async reorder(userId: string, projectId: string, dto: ReorderDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.part.update({ where: { id }, data: { order: index } }),
      ),
    );

    return this.findAll(userId, projectId);
  }
}
