import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { CreateNoteGroupDto, UpdateNoteGroupDto } from './dto/note.dto';

@Injectable()
export class NoteGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateNoteGroupDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    const order = await this.prisma.noteGroup.count({ where: { projectId } });
    return this.prisma.noteGroup.create({
      data: { projectId, name: dto.name, color: dto.color, order },
    });
  }

  async findAll(userId: string, projectId: string, includeArchived = false) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.noteGroup.findMany({
      where: { projectId, ...(includeArchived ? {} : { archived: false }) },
      orderBy: { order: 'asc' },
      include: { _count: { select: { notes: true } } },
    });
  }

  async update(userId: string, groupId: string, dto: UpdateNoteGroupDto) {
    const group = await this.requireGroup(groupId);
    await this.access.assertRole(userId, group.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.noteGroup.update({ where: { id: groupId }, data: dto });
  }

  /** Las notas del grupo vuelven a la Bandeja (onDelete: SetNull en el schema) — nunca se pierden. */
  async remove(userId: string, groupId: string) {
    const group = await this.requireGroup(groupId);
    await this.access.assertRole(userId, group.projectId, ProjectAccessService.WRITE_ROLES);
    await this.prisma.noteGroup.delete({ where: { id: groupId } });
    return { id: groupId, deleted: true };
  }

  private async requireGroup(groupId: string) {
    const group = await this.prisma.noteGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    return group;
  }
}
