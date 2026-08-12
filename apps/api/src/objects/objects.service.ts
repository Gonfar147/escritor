import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { IndexingService } from '../indexing/indexing.service';
import { objectIndexText } from '../indexing/entity-text.util';
import { CreateObjectDto, UpdateObjectDto, LinkSceneDto } from './dto/object.dto';

@Injectable()
export class ObjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly indexing: IndexingService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateObjectDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    const object = await this.prisma.storyObject.create({ data: { ...dto, projectId } });
    this.indexing.indexEntityAsync(projectId, 'OBJECT', object.id, object.name, objectIndexText(object));
    return object;
  }

  async findAll(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.storyObject.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: {
        owner: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(userId: string, objectId: string) {
    const object = await this.prisma.storyObject.findUnique({
      where: { id: objectId },
      include: {
        owner: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    if (!object) throw new NotFoundException('Objeto no encontrado');
    await this.access.assertMember(userId, object.projectId);

    const appearances = await this.prisma.sceneObject.findMany({
      where: { objectId },
      include: {
        scene: {
          select: {
            id: true,
            title: true,
            order: true,
            chapter: { select: { id: true, title: true, part: { select: { order: true } } } },
          },
        },
      },
    });

    const scenesSorted = appearances
      .map((a) => a.scene)
      .sort((a, b) => (a.chapter.part.order - b.chapter.part.order) || (a.order - b.order));

    return {
      ...object,
      scenes: scenesSorted,
      firstAppearance: scenesSorted[0] ?? null,
      lastAppearance: scenesSorted[scenesSorted.length - 1] ?? null,
    };
  }

  async update(userId: string, objectId: string, dto: UpdateObjectDto) {
    const object = await this.requireObject(objectId);
    await this.access.assertRole(userId, object.projectId, ProjectAccessService.WRITE_ROLES);
    const updated = await this.prisma.storyObject.update({ where: { id: objectId }, data: dto });
    this.indexing.indexEntityAsync(object.projectId, 'OBJECT', updated.id, updated.name, objectIndexText(updated));
    return updated;
  }

  async remove(userId: string, objectId: string) {
    const object = await this.requireObject(objectId);
    await this.access.assertRole(userId, object.projectId, ProjectAccessService.WRITE_ROLES);
    const removed = await this.prisma.storyObject.delete({ where: { id: objectId } });
    this.indexing.removeEntityAsync('OBJECT', objectId);
    return removed;
  }

  async linkScene(userId: string, objectId: string, dto: LinkSceneDto) {
    const object = await this.requireObject(objectId);
    await this.access.assertRole(userId, object.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.sceneObject.upsert({
      where: { sceneId_objectId: { sceneId: dto.sceneId, objectId } },
      create: { sceneId: dto.sceneId, objectId },
      update: {},
    });
  }

  async unlinkScene(userId: string, objectId: string, sceneId: string) {
    const object = await this.requireObject(objectId);
    await this.access.assertRole(userId, object.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.sceneObject.delete({
      where: { sceneId_objectId: { sceneId, objectId } },
    });
  }

  private async requireObject(objectId: string) {
    const object = await this.prisma.storyObject.findUnique({ where: { id: objectId } });
    if (!object) throw new NotFoundException('Objeto no encontrado');
    return object;
  }
}
