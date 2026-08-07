import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { MapType } from '@prisma/client';
import {
  CreateMapDto,
  UpdateMapDto,
  CreatePinDto,
  UpdatePinDto,
  CreateMovementDto,
} from './dto/map.dto';

@Injectable()
export class MapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  // ---- MapAsset ----

  async create(userId: string, projectId: string, dto: CreateMapDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.mapAsset.create({ data: { ...dto, projectId } });
  }

  async findAll(userId: string, projectId: string, mapType?: MapType) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.mapAsset.findMany({
      where: { projectId, ...(mapType ? { mapType } : {}) },
      orderBy: { title: 'asc' },
    });
  }

  /** Árbol Mundo → Ciudad → Edificio, para el selector de mapas del frontend */
  async findTree(userId: string, projectId: string) {
    const maps = await this.findAll(userId, projectId);
    const byId = new Map(maps.map((m) => [m.id, { ...m, children: [] as any[] }]));
    const roots: any[] = [];
    for (const map of byId.values()) {
      if (map.parentMapId && byId.has(map.parentMapId)) {
        byId.get(map.parentMapId)!.children.push(map);
      } else {
        roots.push(map);
      }
    }
    return roots;
  }

  async findOne(userId: string, mapId: string) {
    const map = await this.prisma.mapAsset.findUnique({
      where: { id: mapId },
      include: {
        childMaps: { select: { id: true, title: true, mapType: true } },
        pins: {
          include: {
            location: { select: { id: true, name: true } },
            character: { select: { id: true, name: true, photoUrl: true } },
          },
        },
      },
    });
    if (!map) throw new NotFoundException('Mapa no encontrado');
    await this.access.assertMember(userId, map.projectId);
    return map;
  }

  async update(userId: string, mapId: string, dto: UpdateMapDto) {
    const map = await this.requireMap(mapId);
    await this.access.assertRole(userId, map.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.mapAsset.update({ where: { id: mapId }, data: dto });
  }

  async remove(userId: string, mapId: string) {
    const map = await this.requireMap(mapId);
    await this.access.assertRole(userId, map.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.mapAsset.delete({ where: { id: mapId } });
  }

  // ---- MapPin ----

  async addPin(userId: string, mapId: string, dto: CreatePinDto) {
    const map = await this.requireMap(mapId);
    await this.access.assertRole(userId, map.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.mapPin.create({ data: { ...dto, mapId } });
  }

  async updatePin(userId: string, pinId: string, dto: UpdatePinDto) {
    const pin = await this.requirePin(pinId);
    const map = await this.requireMap(pin.mapId);
    await this.access.assertRole(userId, map.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.mapPin.update({ where: { id: pinId }, data: dto });
  }

  async removePin(userId: string, pinId: string) {
    const pin = await this.requirePin(pinId);
    const map = await this.requireMap(pin.mapId);
    await this.access.assertRole(userId, map.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.mapPin.delete({ where: { id: pinId } });
  }

  // ---- CharacterMovement ----

  async addMovement(userId: string, mapId: string, dto: CreateMovementDto) {
    const map = await this.requireMap(mapId);
    await this.access.assertRole(userId, map.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.characterMovement.create({ data: { ...dto, mapId } });
  }

  async removeMovement(userId: string, movementId: string) {
    const movement = await this.prisma.characterMovement.findUnique({ where: { id: movementId } });
    if (!movement) throw new NotFoundException('Movimiento no encontrado');
    const map = await this.requireMap(movement.mapId);
    await this.access.assertRole(userId, map.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.characterMovement.delete({ where: { id: movementId } });
  }

  /**
   * Recorrido de un personaje sobre un mapa, ordenado narrativamente
   * (por posición de la escena ancla) cuando el punto tiene escena asociada;
   * si no, se ordena por fecha de creación como fallback.
   */
  async characterPath(userId: string, characterId: string, mapId: string) {
    const map = await this.requireMap(mapId);
    await this.access.assertMember(userId, map.projectId);

    const movements = await this.prisma.characterMovement.findMany({
      where: { characterId, mapId },
      include: {
        scene: {
          select: { id: true, title: true, order: true, chapter: { select: { order: true, part: { select: { order: true } } } } },
        },
        event: { select: { id: true, title: true, sortKey: true } },
      },
    });

    return movements
      .map((m) => ({
        ...m,
        narrativePosition: m.scene
          ? [m.scene.chapter.part.order, m.scene.chapter.order, m.scene.order]
          : null,
      }))
      .sort((a, b) => {
        if (a.narrativePosition && b.narrativePosition) {
          return (
            a.narrativePosition[0] - b.narrativePosition[0] ||
            a.narrativePosition[1] - b.narrativePosition[1] ||
            a.narrativePosition[2] - b.narrativePosition[2]
          );
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  private async requireMap(mapId: string) {
    const map = await this.prisma.mapAsset.findUnique({ where: { id: mapId } });
    if (!map) throw new NotFoundException('Mapa no encontrado');
    return map;
  }

  private async requirePin(pinId: string) {
    const pin = await this.prisma.mapPin.findUnique({ where: { id: pinId } });
    if (!pin) throw new NotFoundException('Pin no encontrado');
    return pin;
  }
}
