import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { CreateEventCausalityDto } from './dto/event-causality.dto';

@Injectable()
export class EventCausalityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  /** Todos los vínculos causales del proyecto, para armar la red completa (punto 17 del prompt). */
  async listForProject(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.eventCausality.findMany({
      where: { fromEvent: { projectId } },
      include: {
        fromEvent: { select: { id: true, title: true, sortKey: true } },
        toEvent: { select: { id: true, title: true, sortKey: true } },
      },
    });
  }

  async create(userId: string, dto: CreateEventCausalityDto) {
    if (dto.fromEventId === dto.toEventId) {
      throw new BadRequestException('Un acontecimiento no puede provocarse a sí mismo');
    }

    const [fromEvent, toEvent] = await Promise.all([
      this.prisma.timelineEvent.findUnique({ where: { id: dto.fromEventId } }),
      this.prisma.timelineEvent.findUnique({ where: { id: dto.toEventId } }),
    ]);
    if (!fromEvent || !toEvent) throw new NotFoundException('Alguno de los acontecimientos no existe');
    if (fromEvent.projectId !== toEvent.projectId) {
      throw new BadRequestException('Los dos acontecimientos deben ser del mismo proyecto');
    }
    await this.access.assertRole(userId, fromEvent.projectId, ProjectAccessService.WRITE_ROLES);

    return this.prisma.eventCausality.create({ data: dto });
  }

  async remove(userId: string, causalityId: string) {
    const causality = await this.prisma.eventCausality.findUnique({
      where: { id: causalityId },
      include: { fromEvent: true },
    });
    if (!causality) throw new NotFoundException('Vínculo causal no encontrado');
    await this.access.assertRole(userId, causality.fromEvent.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.eventCausality.delete({ where: { id: causalityId } });
  }
}
