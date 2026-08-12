import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { IndexingService } from '../indexing/indexing.service';
import {
  CreateNoteDto,
  UpdateNoteDto,
  MoveNoteDto,
  SetNoteTagsDto,
  SetNoteRelationsDto,
} from './dto/note.dto';

export interface NoteFilters {
  groupId?: string | 'unorganized';
  tag?: string;
  status?: string;
  entityType?: string;
  entityId?: string;
  search?: string;
}

const NOTE_INCLUDE = {
  group: { select: { id: true, name: true, color: true } },
  noteTags: { include: { tag: true } },
  relations: true,
} as const;

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly indexing: IndexingService,
  ) {}

  /** Máxima fricción mínima: content es lo único obligatorio (punto 3 / punto 27). */
  async create(userId: string, projectId: string, dto: CreateNoteDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    if (dto.groupId) await this.requireGroupInProject(dto.groupId, projectId);

    const note = await this.prisma.note.create({
      data: {
        projectId,
        title: dto.title,
        content: dto.content,
        groupId: dto.groupId,
      },
      include: NOTE_INCLUDE,
    });

    if (dto.tags?.length) {
      await this.setTags(userId, note.id, { tags: dto.tags });
    }

    this.reindex(note.id, projectId, note.title, note.content);
    return this.findOne(userId, note.id);
  }

  async findAll(userId: string, projectId: string, filters: NoteFilters = {}) {
    await this.access.assertMember(userId, projectId);

    const where: any = { projectId };

    if (filters.groupId === 'unorganized') {
      where.groupId = null;
    } else if (filters.groupId) {
      where.groupId = filters.groupId;
    }

    if (filters.status) where.status = filters.status;

    if (filters.tag) {
      where.noteTags = { some: { tag: { name: filters.tag } } };
    }

    if (filters.entityType && filters.entityId) {
      where.relations = { some: { entityType: filters.entityType, entityId: filters.entityId } };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.note.findMany({
      where,
      include: NOTE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, noteId: string) {
    const note = await this.requireNote(noteId);
    await this.access.assertMember(userId, note.projectId);
    return this.prisma.note.findUnique({ where: { id: noteId }, include: NOTE_INCLUDE });
  }

  async update(userId: string, noteId: string, dto: UpdateNoteDto) {
    const note = await this.requireNote(noteId);
    await this.access.assertRole(userId, note.projectId, ProjectAccessService.WRITE_ROLES);

    const updated = await this.prisma.note.update({
      where: { id: noteId },
      data: dto,
      include: NOTE_INCLUDE,
    });

    this.reindex(updated.id, updated.projectId, updated.title, updated.content);
    return updated;
  }

  /**
   * Punto 7: una nota descartada NUNCA se borra automáticamente — "eliminar" acá
   * es el único gesto destructivo real (papelera manual del autor), separado de
   * cambiar el estado a DISCARDED (que conserva la nota en el historial creativo).
   */
  async remove(userId: string, noteId: string) {
    const note = await this.requireNote(noteId);
    await this.access.assertRole(userId, note.projectId, ProjectAccessService.WRITE_ROLES);
    await this.prisma.note.delete({ where: { id: noteId } });
    this.indexing.removeEntityAsync('NOTE', noteId);
    return { id: noteId, deleted: true };
  }

  /** groupId: null = mover a la Bandeja. */
  async move(userId: string, noteId: string, dto: MoveNoteDto) {
    const note = await this.requireNote(noteId);
    await this.access.assertRole(userId, note.projectId, ProjectAccessService.WRITE_ROLES);

    if (dto.groupId) await this.requireGroupInProject(dto.groupId, note.projectId);

    return this.prisma.note.update({
      where: { id: noteId },
      data: { groupId: dto.groupId ?? null },
      include: NOTE_INCLUDE,
    });
  }

  /** Reemplaza el set completo de tags. Crea los tags del proyecto que todavía no existan. */
  async setTags(userId: string, noteId: string, dto: SetNoteTagsDto) {
    const note = await this.requireNote(noteId);
    await this.access.assertRole(userId, note.projectId, ProjectAccessService.WRITE_ROLES);

    const names = [...new Set(dto.tags.map((t) => t.trim().replace(/^#/, '')).filter(Boolean))];

    const tagIds: string[] = [];
    for (const name of names) {
      const tag = await this.prisma.tag.upsert({
        where: { projectId_name: { projectId: note.projectId, name } },
        create: { projectId: note.projectId, name },
        update: {},
      });
      tagIds.push(tag.id);
    }

    await this.prisma.$transaction([
      this.prisma.noteTag.deleteMany({ where: { noteId } }),
      ...tagIds.map((tagId) => this.prisma.noteTag.create({ data: { noteId, tagId } })),
    ]);

    return this.findOne(userId, noteId);
  }

  /** Reemplaza el set completo de relaciones (punto 6). Valida que cada entidad exista en el mismo proyecto. */
  async setRelations(userId: string, noteId: string, dto: SetNoteRelationsDto) {
    const note = await this.requireNote(noteId);
    await this.access.assertRole(userId, note.projectId, ProjectAccessService.WRITE_ROLES);

    for (const rel of dto.relations) {
      await this.assertEntityInProject(rel.entityType, rel.entityId, note.projectId);
    }

    await this.prisma.$transaction([
      this.prisma.noteRelation.deleteMany({ where: { noteId } }),
      ...dto.relations.map((rel) =>
        this.prisma.noteRelation.create({ data: { noteId, entityType: rel.entityType as any, entityId: rel.entityId } }),
      ),
    ]);

    return this.findOne(userId, noteId);
  }

  /**
   * "Ver notas relacionadas" desde Personaje/Capítulo/Escena/Lugar/etc. (punto 21).
   * Revalida membership acá porque es un endpoint público del módulo Notas, aunque
   * el módulo que enlaza a esto ya haya autorizado su propia parte.
   */
  async findRelatedTo(userId: string, projectId: string, entityType: string, entityId: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.note.findMany({
      where: { projectId, relations: { some: { entityType: entityType as any, entityId } } },
      include: NOTE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async countRelatedTo(projectId: string, entityType: string, entityId: string): Promise<number> {
    return this.prisma.note.count({
      where: { projectId, relations: { some: { entityType: entityType as any, entityId } } },
    });
  }

  // ---- helpers internos ----

  private reindex(noteId: string, projectId: string, title: string | null, content: string) {
    this.indexing.indexEntityAsync(projectId, 'NOTE', noteId, title ?? 'Nota sin título', content);
  }

  private async requireNote(noteId: string) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Nota no encontrada');
    return note;
  }

  private async requireGroupInProject(groupId: string, projectId: string) {
    const group = await this.prisma.noteGroup.findFirst({ where: { id: groupId, projectId } });
    if (!group) throw new NotFoundException('El grupo indicado no existe en este proyecto');
    return group;
  }

  /**
   * Valida que la entidad relacionada exista y pertenezca al mismo proyecto —
   * evita que una nota quede "relacionada" con un personaje de otra novela.
   */
  private async assertEntityInProject(entityType: string, entityId: string, projectId: string) {
    const exists = await (() => {
      switch (entityType) {
        case 'CHARACTER':
          return this.prisma.character.findFirst({ where: { id: entityId, projectId }, select: { id: true } });
        case 'LOCATION':
          return this.prisma.location.findFirst({ where: { id: entityId, projectId }, select: { id: true } });
        case 'TIMELINE_EVENT':
          return this.prisma.timelineEvent.findFirst({ where: { id: entityId, projectId }, select: { id: true } });
        case 'PART':
          return this.prisma.part.findFirst({ where: { id: entityId, projectId }, select: { id: true } });
        case 'SEQUENCE':
          return this.prisma.sequence.findFirst({ where: { id: entityId, part: { projectId } }, select: { id: true } });
        case 'CHAPTER':
          return this.prisma.chapter.findFirst({ where: { id: entityId, part: { projectId } }, select: { id: true } });
        case 'SCENE':
          return this.prisma.scene.findFirst({ where: { id: entityId, chapter: { part: { projectId } } }, select: { id: true } });
        default:
          return null;
      }
    })();

    if (!exists) throw new NotFoundException(`${entityType} no encontrado en este proyecto`);
  }
}
