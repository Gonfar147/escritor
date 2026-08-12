import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectAccessService } from '../../common/project-access.service';
import { countWordsInTiptapDoc } from '../../common/word-count.util';
import { IndexingService } from '../../indexing/indexing.service';
import { extractTextFromTiptapDoc } from '../../indexing/text-chunking.util';
import {
  CreateSceneDto,
  UpdateSceneDto,
  ReorderScenesDto,
  MoveSceneDto,
  MergeScenesDto,
  SplitSceneDto,
} from './dto/scene.dto';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph', content: [] }] };

@Injectable()
export class ScenesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly indexing: IndexingService,
  ) {}

  async create(userId: string, chapterId: string, dto: CreateSceneDto) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const order = dto.order ?? (await this.prisma.scene.count({ where: { chapterId } }));
    const content = dto.content ?? EMPTY_DOC;

    const scene = await this.prisma.scene.create({
      data: {
        chapterId,
        title: dto.title,
        order,
        content: content as any,
        wordCount: countWordsInTiptapDoc(content),
      },
    });
    this.indexing.indexEntityAsync(projectId, 'SCENE', scene.id, scene.title, extractTextFromTiptapDoc(content));
    return scene;
  }

  async findAll(userId: string, chapterId: string) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertMember(userId, projectId);
    return this.prisma.scene.findMany({ where: { chapterId }, orderBy: { order: 'asc' } });
  }

  async findOne(userId: string, sceneId: string) {
    const projectId = await this.access.projectIdForScene(sceneId);
    await this.access.assertMember(userId, projectId);
    const scene = await this.prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene) throw new NotFoundException('Escena no encontrada');
    return scene;
  }

  /**
   * Autoguardado: actualiza contenido y contador de palabras.
   * No crea una versión en cada llamada (se llamaría cada pocos segundos);
   * las versiones se crean explícitamente via `createVersion`.
   */
  async update(userId: string, sceneId: string, dto: UpdateSceneDto) {
    const projectId = await this.access.projectIdForScene(sceneId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const data: any = { ...dto };
    if (dto.content !== undefined) {
      data.wordCount = countWordsInTiptapDoc(dto.content);
    }

    const scene = await this.prisma.scene.update({ where: { id: sceneId }, data });
    if (dto.content !== undefined || dto.title !== undefined) {
      this.indexing.indexEntityAsync(projectId, 'SCENE', scene.id, scene.title, extractTextFromTiptapDoc(scene.content));
    }
    return scene;
  }

  async remove(userId: string, sceneId: string) {
    const projectId = await this.access.projectIdForScene(sceneId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    const scene = await this.prisma.scene.delete({ where: { id: sceneId } });
    this.indexing.removeEntityAsync('SCENE', sceneId);
    return scene;
  }

  async reorder(userId: string, chapterId: string, dto: ReorderScenesDto) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.scene.update({ where: { id }, data: { order: index } }),
      ),
    );
    return this.findAll(userId, chapterId);
  }

  async move(userId: string, sceneId: string, dto: MoveSceneDto) {
    const projectId = await this.access.projectIdForScene(sceneId);
    const targetProjectId = await this.access.projectIdForChapter(dto.targetChapterId);
    if (projectId !== targetProjectId) {
      throw new BadRequestException('No se puede mover una escena entre proyectos distintos');
    }
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const order = dto.order ?? (await this.prisma.scene.count({ where: { chapterId: dto.targetChapterId } }));

    return this.prisma.scene.update({
      where: { id: sceneId },
      data: { chapterId: dto.targetChapterId, order },
    });
  }

  async duplicate(userId: string, sceneId: string) {
    const projectId = await this.access.projectIdForScene(sceneId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const original = await this.prisma.scene.findUnique({ where: { id: sceneId } });
    if (!original) throw new NotFoundException('Escena no encontrada');

    const siblingCount = await this.prisma.scene.count({ where: { chapterId: original.chapterId } });

    const copy = await this.prisma.scene.create({
      data: {
        chapterId: original.chapterId,
        title: `${original.title} (copia)`,
        order: siblingCount,
        content: original.content as any,
        wordCount: original.wordCount,
        status: 'DRAFT',
      },
    });
    this.indexing.indexEntityAsync(projectId, 'SCENE', copy.id, copy.title, extractTextFromTiptapDoc(copy.content));
    return copy;
  }

  /** Fusiona varias escenas en una: concatena el contenido de sus documentos Tiptap */
  async merge(userId: string, dto: MergeScenesDto) {
    if (dto.sceneIds.length < 2) {
      throw new BadRequestException('Se necesitan al menos 2 escenas para fusionar');
    }

    const scenes = await this.prisma.scene.findMany({ where: { id: { in: dto.sceneIds } } });
    if (scenes.length !== dto.sceneIds.length) {
      throw new NotFoundException('Alguna de las escenas no existe');
    }

    const projectId = await this.access.projectIdForScene(scenes[0].id);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const ordered = dto.sceneIds.map((id) => scenes.find((s) => s.id === id)!);
    const [target, ...toMerge] = ordered;

    const targetContent = target.content as any;
    const mergedContent = {
      ...targetContent,
      content: [
        ...(targetContent?.content ?? []),
        ...toMerge.flatMap((s) => (s.content as any)?.content ?? []),
      ],
    };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.scene.update({
        where: { id: target.id },
        data: {
          content: mergedContent,
          wordCount: countWordsInTiptapDoc(mergedContent),
          title: dto.newTitle ?? target.title,
        },
      });
      await tx.scene.deleteMany({ where: { id: { in: toMerge.map((s) => s.id) } } });
      return updated;
    }).then((updated) => {
      toMerge.forEach((s) => this.indexing.removeEntityAsync('SCENE', s.id));
      this.indexing.indexEntityAsync(projectId, 'SCENE', updated.id, updated.title, extractTextFromTiptapDoc(updated.content));
      return updated;
    });
  }

  /** Divide una escena en dos, cortando el documento en el índice de nodo indicado */
  async split(userId: string, sceneId: string, dto: SplitSceneDto) {
    const projectId = await this.access.projectIdForScene(sceneId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const scene = await this.prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene) throw new NotFoundException('Escena no encontrada');

    const content = scene.content as any;
    const nodes: any[] = content?.content ?? [];

    if (dto.splitAtNodeIndex <= 0 || dto.splitAtNodeIndex >= nodes.length) {
      throw new BadRequestException('Índice de división fuera de rango');
    }

    const firstHalf = { ...content, content: nodes.slice(0, dto.splitAtNodeIndex) };
    const secondHalf = { ...content, content: nodes.slice(dto.splitAtNodeIndex) };

    const siblingCount = await this.prisma.scene.count({ where: { chapterId: scene.chapterId } });

    return this.prisma.$transaction(async (tx) => {
      const updatedOriginal = await tx.scene.update({
        where: { id: scene.id },
        data: { content: firstHalf, wordCount: countWordsInTiptapDoc(firstHalf) },
      });

      const newScene = await tx.scene.create({
        data: {
          chapterId: scene.chapterId,
          title: dto.newSceneTitle ?? `${scene.title} (parte 2)`,
          order: siblingCount,
          content: secondHalf,
          wordCount: countWordsInTiptapDoc(secondHalf),
        },
      });

      return { original: updatedOriginal, newScene };
    }).then((result) => {
      this.indexing.indexEntityAsync(
        projectId,
        'SCENE',
        result.original.id,
        result.original.title,
        extractTextFromTiptapDoc(result.original.content),
      );
      this.indexing.indexEntityAsync(
        projectId,
        'SCENE',
        result.newScene.id,
        result.newScene.title,
        extractTextFromTiptapDoc(result.newScene.content),
      );
      return result;
    });
  }

  // ---- Versiones (snapshots explícitos, no en cada autoguardado) ----

  async createVersion(userId: string, sceneId: string) {
    const projectId = await this.access.projectIdForScene(sceneId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const scene = await this.prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene) throw new NotFoundException('Escena no encontrada');

    return this.prisma.sceneVersion.create({
      data: { sceneId, content: scene.content as any, wordCount: scene.wordCount },
    });
  }

  async listVersions(userId: string, sceneId: string) {
    const projectId = await this.access.projectIdForScene(sceneId);
    await this.access.assertMember(userId, projectId);
    return this.prisma.sceneVersion.findMany({
      where: { sceneId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async restoreVersion(userId: string, sceneId: string, versionId: string) {
    const projectId = await this.access.projectIdForScene(sceneId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const version = await this.prisma.sceneVersion.findUnique({ where: { id: versionId } });
    if (!version || version.sceneId !== sceneId) {
      throw new NotFoundException('Versión no encontrada');
    }

    // Guardamos el estado actual como versión antes de sobreescribir, para no perder nada
    const current = await this.prisma.scene.findUniqueOrThrow({ where: { id: sceneId } });
    await this.prisma.sceneVersion.create({
      data: { sceneId, content: current.content as any, wordCount: current.wordCount },
    });

    return this.prisma.scene.update({
      where: { id: sceneId },
      data: { content: version.content as any, wordCount: version.wordCount },
    });
  }
}
