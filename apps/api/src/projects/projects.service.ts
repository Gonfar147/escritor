import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectRole } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        members: {
          create: { userId, role: ProjectRole.OWNER },
        },
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true, parts: { include: { chapters: true }, orderBy: { order: 'asc' } } },
    });

    if (!project) throw new NotFoundException('Proyecto no encontrado');

    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('No tenés acceso a este proyecto');

    return project;
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    await this.assertRole(userId, projectId, [ProjectRole.OWNER, ProjectRole.COAUTHOR, ProjectRole.EDITOR]);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async remove(userId: string, projectId: string) {
    await this.assertRole(userId, projectId, [ProjectRole.OWNER]);
    return this.prisma.project.delete({ where: { id: projectId } });
  }

  private async assertRole(userId: string, projectId: string, allowed: ProjectRole[]) {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership || !allowed.includes(membership.role)) {
      throw new ForbiddenException('No tenés permiso para esta acción');
    }
  }
}
