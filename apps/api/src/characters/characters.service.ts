import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { IndexingService } from '../indexing/indexing.service';
import { characterIndexText } from '../indexing/entity-text.util';
import {
  CreateCharacterDto,
  UpdateCharacterDto,
  CreateCharacterRelationshipDto,
  LinkSceneDto,
} from './dto/character.dto';

@Injectable()
export class CharactersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly indexing: IndexingService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateCharacterDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    const character = await this.prisma.character.create({
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        projectId,
      } as any,
    });
    this.indexing.indexEntityAsync(projectId, 'CHARACTER', character.id, character.name, characterIndexText(character));
    return character;
  }

  async findAll(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.character.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, characterId: string) {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: {
        relationsFrom: { include: { relatedCharacter: { select: { id: true, name: true, photoUrl: true } } } },
        ownedObjects: { select: { id: true, name: true } },
      },
    });
    if (!character) throw new NotFoundException('Personaje no encontrado');
    await this.access.assertMember(userId, character.projectId);

    const appearances = await this.appearanceStats(characterId);
    return { ...character, ...appearances };
  }

  async update(userId: string, characterId: string, dto: UpdateCharacterDto) {
    const character = await this.requireCharacter(characterId);
    await this.access.assertRole(userId, character.projectId, ProjectAccessService.WRITE_ROLES);
    const updated = await this.prisma.character.update({
      where: { id: characterId },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      } as any,
    });
    this.indexing.indexEntityAsync(character.projectId, 'CHARACTER', updated.id, updated.name, characterIndexText(updated));
    return updated;
  }

  async remove(userId: string, characterId: string) {
    const character = await this.requireCharacter(characterId);
    await this.access.assertRole(userId, character.projectId, ProjectAccessService.WRITE_ROLES);
    const removed = await this.prisma.character.delete({ where: { id: characterId } });
    this.indexing.removeEntityAsync('CHARACTER', characterId);
    return removed;
  }

  // ---- Relaciones entre personajes (familia, aliados, enemigos, mentores, parejas) ----

  async addRelationship(userId: string, characterId: string, dto: CreateCharacterRelationshipDto) {
    const character = await this.requireCharacter(characterId);
    await this.access.assertRole(userId, character.projectId, ProjectAccessService.WRITE_ROLES);

    return this.prisma.characterRelationship.create({
      data: {
        characterId,
        relatedCharacterId: dto.relatedCharacterId,
        type: dto.type,
        description: dto.description,
      },
    });
  }

  async removeRelationship(userId: string, characterId: string, relationshipId: string) {
    const character = await this.requireCharacter(characterId);
    await this.access.assertRole(userId, character.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.characterRelationship.delete({ where: { id: relationshipId } });
  }

  // ---- Asociación con escenas ----

  async linkScene(userId: string, characterId: string, dto: LinkSceneDto) {
    const character = await this.requireCharacter(characterId);
    await this.access.assertRole(userId, character.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.sceneCharacter.upsert({
      where: { sceneId_characterId: { sceneId: dto.sceneId, characterId } },
      create: { sceneId: dto.sceneId, characterId },
      update: {},
    });
  }

  async unlinkScene(userId: string, characterId: string, sceneId: string) {
    const character = await this.requireCharacter(characterId);
    await this.access.assertRole(userId, character.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.sceneCharacter.delete({
      where: { sceneId_characterId: { sceneId, characterId } },
    });
  }

  /**
   * Primera/última aparición, escenas y capítulos donde aparece, y "tiempo en pantalla"
   * aproximado como cantidad de escenas (proxy simple hasta tener duración real de lectura).
   */
  private async appearanceStats(characterId: string) {
    const appearances = await this.prisma.sceneCharacter.findMany({
      where: { characterId },
      include: {
        scene: {
          select: {
            id: true,
            title: true,
            order: true,
            wordCount: true,
            chapter: { select: { id: true, title: true, part: { select: { order: true } } } },
          },
        },
      },
    });

    const scenesSorted = appearances
      .map((a) => a.scene)
      .sort((a, b) => (a.chapter.part.order - b.chapter.part.order) || (a.order - b.order));

    const chapterIds = [...new Set(scenesSorted.map((s) => s.chapter.id))];

    return {
      sceneCount: scenesSorted.length,
      chapterCount: chapterIds.length,
      screenTimeWords: scenesSorted.reduce((sum, s) => sum + s.wordCount, 0),
      firstAppearance: scenesSorted[0] ?? null,
      lastAppearance: scenesSorted[scenesSorted.length - 1] ?? null,
      scenes: scenesSorted,
    };
  }

  /**
   * Árbol genealógico: recorre CharacterRelationship (tipo FAMILY) en BFS
   * hasta `depth` saltos en ambas direcciones, partiendo del personaje dado.
   * No es un modelo nuevo — reusa las relaciones ya creadas en el Módulo 5,
   * que es lo que alimenta el "Árbol genealógico" del Módulo 8 (World Building).
   */
  async familyTree(userId: string, characterId: string, depth = 3) {
    const root = await this.requireCharacter(characterId);
    await this.access.assertMember(userId, root.projectId);

    const nodes = new Map<string, { id: string; name: string; photoUrl: string | null; status: string }>();
    const edges: { fromId: string; toId: string; description: string | null }[] = [];
    const visited = new Set<string>();
    let frontier = [characterId];

    for (let level = 0; level <= depth && frontier.length > 0; level++) {
      const relations = await this.prisma.characterRelationship.findMany({
        where: {
          type: 'FAMILY',
          OR: [{ characterId: { in: frontier } }, { relatedCharacterId: { in: frontier } }],
        },
        include: {
          character: { select: { id: true, name: true, photoUrl: true, status: true } },
          relatedCharacter: { select: { id: true, name: true, photoUrl: true, status: true } },
        },
      });

      const nextFrontier: string[] = [];
      for (const rel of relations) {
        nodes.set(rel.character.id, rel.character);
        nodes.set(rel.relatedCharacter.id, rel.relatedCharacter);
        edges.push({ fromId: rel.characterId, toId: rel.relatedCharacterId, description: rel.description });

        for (const id of [rel.characterId, rel.relatedCharacterId]) {
          if (!visited.has(id)) nextFrontier.push(id);
        }
      }
      frontier.forEach((id) => visited.add(id));
      frontier = [...new Set(nextFrontier)];
    }

    nodes.set(root.id, { id: root.id, name: root.name, photoUrl: root.photoUrl, status: root.status });

    return { nodes: [...nodes.values()], edges };
  }

  private async requireCharacter(characterId: string) {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException('Personaje no encontrado');
    return character;
  }
}
