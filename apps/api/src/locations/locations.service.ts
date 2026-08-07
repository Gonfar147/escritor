import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { CreateLocationDto, UpdateLocationDto, LinkSceneDto } from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateLocationDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.location.create({ data: { ...dto, projectId } });
  }

  async findAll(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.location.findMany({ where: { projectId }, orderBy: { name: 'asc' } });
  }

  async findOne(userId: string, locationId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      include: { objects: { select: { id: true, name: true } } },
    });
    if (!location) throw new NotFoundException('Lugar no encontrado');
    await this.access.assertMember(userId, location.projectId);

    const appearances = await this.prisma.sceneLocation.findMany({
      where: { locationId },
      include: {
        scene: {
          select: {
            id: true,
            title: true,
            characterAppearances: {
              select: { character: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    const charactersHere = new Map<string, { id: string; name: string }>();
    appearances.forEach((a) =>
      a.scene.characterAppearances.forEach((c) => charactersHere.set(c.character.id, c.character)),
    );

    return {
      ...location,
      scenes: appearances.map((a) => a.scene),
      charactersAssociated: [...charactersHere.values()],
    };
  }

  async update(userId: string, locationId: string, dto: UpdateLocationDto) {
    const location = await this.requireLocation(locationId);
    await this.access.assertRole(userId, location.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.location.update({ where: { id: locationId }, data: dto });
  }

  async remove(userId: string, locationId: string) {
    const location = await this.requireLocation(locationId);
    await this.access.assertRole(userId, location.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.location.delete({ where: { id: locationId } });
  }

  async linkScene(userId: string, locationId: string, dto: LinkSceneDto) {
    const location = await this.requireLocation(locationId);
    await this.access.assertRole(userId, location.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.sceneLocation.upsert({
      where: { sceneId_locationId: { sceneId: dto.sceneId, locationId } },
      create: { sceneId: dto.sceneId, locationId },
      update: {},
    });
  }

  async unlinkScene(userId: string, locationId: string, sceneId: string) {
    const location = await this.requireLocation(locationId);
    await this.access.assertRole(userId, location.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.sceneLocation.delete({
      where: { sceneId_locationId: { sceneId, locationId } },
    });
  }

  private async requireLocation(locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundException('Lugar no encontrado');
    return location;
  }
}
