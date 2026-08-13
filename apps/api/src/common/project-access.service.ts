import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectRole } from '@prisma/client';

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async projectIdForPart(partId: string): Promise<string> {
    const part = await this.prisma.part.findUnique({ where: { id: partId } });
    if (!part) throw new NotFoundException('Parte no encontrada');
    return part.projectId;
  }

  async projectIdForSequence(sequenceId: string): Promise<string> {
    const sequence = await this.prisma.sequence.findUnique({
      where: { id: sequenceId },
      include: { part: true },
    });
    if (!sequence) throw new NotFoundException('Secuencia no encontrada');
    return sequence.part.projectId;
  }

  async projectIdForChapter(chapterId: string): Promise<string> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { part: true },
    });
    if (!chapter) throw new NotFoundException('Capítulo no encontrado');
    return chapter.part.projectId;
  }

  async projectIdForScene(sceneId: string): Promise<string> {
    const scene = await this.prisma.scene.findUnique({
      where: { id: sceneId },
      include: { chapter: { include: { part: true } } },
    });
    if (!scene) throw new NotFoundException('Escena no encontrada');
    return scene.chapter.part.projectId;
  }

  /** Lanza ForbiddenException si el usuario no tiene uno de los roles permitidos en el proyecto */
  async assertRole(userId: string, projectId: string, allowed: ProjectRole[]) {
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!membership || !allowed.includes(membership.role)) {
      throw new ForbiddenException('No tenés permiso para esta acción');
    }
    return membership;
  }

  /** Cualquier miembro, sin importar el rol (para lectura) */
  async assertMember(userId: string, projectId: string) {
    return this.assertRole(userId, projectId, [
      ProjectRole.OWNER,
      ProjectRole.COAUTHOR,
      ProjectRole.EDITOR,
      ProjectRole.PROOFREADER,
      ProjectRole.BETA_READER,
    ]);
  }

  /** Roles con permiso de escritura sobre el contenido */
  static readonly WRITE_ROLES: ProjectRole[] = [ProjectRole.OWNER, ProjectRole.COAUTHOR, ProjectRole.EDITOR];
}
