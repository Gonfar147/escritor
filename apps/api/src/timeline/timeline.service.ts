import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { IndexingService } from '../indexing/indexing.service';
import {
  CreateEventDto,
  UpdateEventDto,
  ReorderEventsDto,
  LinkCharacterDto,
  LinkSceneDto,
} from './dto/event.dto';

@Injectable()
export class TimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly indexing: IndexingService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateEventDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const sortKey = dto.sortKey ?? (await this.prisma.timelineEvent.count({ where: { projectId } }));

    const event = await this.prisma.timelineEvent.create({
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
        sortKey,
        projectId,
      },
    });
    this.indexEvent(projectId, event);
    return event;
  }

  /** Orden cronológico: cómo pasaron los hechos en el mundo de la historia */
  async findAllChronological(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.timelineEvent.findMany({
      where: { projectId },
      orderBy: { sortKey: 'asc' },
      include: {
        location: { select: { id: true, name: true } },
        characters: { include: { character: { select: { id: true, name: true, photoUrl: true } } } },
      },
    });
  }

  /**
   * Orden narrativo: en qué momento el LECTOR se entera de cada evento.
   * Se calcula a partir de la posición (parte/capítulo/escena) de la escena
   * MÁS TEMPRANA enlazada al evento — nunca se guarda, siempre se deriva.
   */
  async findAllNarrative(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);

    const events = await this.prisma.timelineEvent.findMany({
      where: { projectId },
      include: {
        location: { select: { id: true, name: true } },
        scenes: {
          include: {
            scene: {
              select: {
                id: true,
                title: true,
                order: true,
                chapter: { select: { order: true, part: { select: { order: true } } } },
              },
            },
          },
        },
      },
    });

    const withPosition = events.map((event) => {
      const positions = event.scenes.map((es) => [
        es.scene.chapter.part.order,
        es.scene.chapter.order,
        es.scene.order,
      ]);
      // El evento se "narra" en su escena más temprana; sin escenas enlazadas, va al final
      const earliest = positions.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])[0];
      return { ...event, narrativePosition: earliest ?? null };
    });

    withPosition.sort((a, b) => {
      if (!a.narrativePosition) return 1;
      if (!b.narrativePosition) return -1;
      return (
        a.narrativePosition[0] - b.narrativePosition[0] ||
        a.narrativePosition[1] - b.narrativePosition[1] ||
        a.narrativePosition[2] - b.narrativePosition[2]
      );
    });

    return withPosition;
  }

  async findOne(userId: string, eventId: string) {
    const event = await this.prisma.timelineEvent.findUnique({
      where: { id: eventId },
      include: {
        location: { select: { id: true, name: true } },
        characters: { include: { character: { select: { id: true, name: true, photoUrl: true } } } },
        scenes: { include: { scene: { select: { id: true, title: true } } } },
      },
    });
    if (!event) throw new NotFoundException('Evento no encontrado');
    await this.access.assertMember(userId, event.projectId);
    return event;
  }

  async update(userId: string, eventId: string, dto: UpdateEventDto) {
    const event = await this.requireEvent(eventId);
    await this.access.assertRole(userId, event.projectId, ProjectAccessService.WRITE_ROLES);
    const updated = await this.prisma.timelineEvent.update({
      where: { id: eventId },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
    this.indexEvent(event.projectId, updated);
    return updated;
  }

  async remove(userId: string, eventId: string) {
    const event = await this.requireEvent(eventId);
    await this.access.assertRole(userId, event.projectId, ProjectAccessService.WRITE_ROLES);
    const removed = await this.prisma.timelineEvent.delete({ where: { id: eventId } });
    this.indexing.removeEntityAsync('TIMELINE_EVENT', eventId);
    return removed;
  }

  private indexEvent(projectId: string, event: { id: string; title: string; description: string | null; displayDate: string | null }) {
    const text = [event.description ?? '', event.displayDate ?? ''].filter(Boolean).join('\n');
    this.indexing.indexEntityAsync(projectId, 'TIMELINE_EVENT', event.id, event.title, text);
  }

  async reorder(userId: string, projectId: string, dto: ReorderEventsDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.timelineEvent.update({ where: { id }, data: { sortKey: index } }),
      ),
    );
    return this.findAllChronological(userId, projectId);
  }

  // ---- Vínculos ----

  async linkCharacter(userId: string, eventId: string, dto: LinkCharacterDto) {
    const event = await this.requireEvent(eventId);
    await this.access.assertRole(userId, event.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.eventCharacter.upsert({
      where: { eventId_characterId: { eventId, characterId: dto.characterId } },
      create: { eventId, characterId: dto.characterId, role: dto.role },
      update: { role: dto.role },
    });
  }

  async unlinkCharacter(userId: string, eventId: string, characterId: string) {
    const event = await this.requireEvent(eventId);
    await this.access.assertRole(userId, event.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.eventCharacter.delete({
      where: { eventId_characterId: { eventId, characterId } },
    });
  }

  async linkScene(userId: string, eventId: string, dto: LinkSceneDto) {
    const event = await this.requireEvent(eventId);
    await this.access.assertRole(userId, event.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.eventScene.upsert({
      where: { eventId_sceneId: { eventId, sceneId: dto.sceneId } },
      create: { eventId, sceneId: dto.sceneId },
      update: {},
    });
  }

  async unlinkScene(userId: string, eventId: string, sceneId: string) {
    const event = await this.requireEvent(eventId);
    await this.access.assertRole(userId, event.projectId, ProjectAccessService.WRITE_ROLES);
    return this.prisma.eventScene.delete({ where: { eventId_sceneId: { eventId, sceneId } } });
  }

  /**
   * Detecta inconsistencias automáticas:
   *  1. Un personaje aparece en un evento posterior (cronológicamente) a su propia muerte.
   *  2. Un personaje aparece en dos eventos con el mismo `sortKey` (mismo instante)
   *     en lugares distintos — no puede estar en dos sitios a la vez.
   */
  async findInconsistencies(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);

    const events = await this.prisma.timelineEvent.findMany({
      where: { projectId },
      orderBy: { sortKey: 'asc' },
      include: {
        characters: { include: { character: { select: { id: true, name: true } } } },
      },
    });

    const warnings: { type: string; message: string; eventIds: string[] }[] = [];

    // Regla 1: aparición después de la muerte
    const deathSortKeyByCharacter = new Map<string, { sortKey: number; eventId: string }>();
    for (const event of events) {
      if (event.eventType === 'DEATH') {
        for (const ec of event.characters) {
          deathSortKeyByCharacter.set(ec.characterId, { sortKey: event.sortKey, eventId: event.id });
        }
      }
    }
    for (const event of events) {
      for (const ec of event.characters) {
        const death = deathSortKeyByCharacter.get(ec.characterId);
        if (death && event.sortKey > death.sortKey && event.id !== death.eventId) {
          warnings.push({
            type: 'APPEARANCE_AFTER_DEATH',
            message: `${ec.character.name} aparece en "${event.title}", que ocurre después de su muerte`,
            eventIds: [death.eventId, event.id],
          });
        }
      }
    }

    // Regla 2: mismo personaje, mismo instante (sortKey), lugares distintos
    const byCharacterAndSortKey = new Map<string, { eventId: string; locationId: string | null }[]>();
    for (const event of events) {
      for (const ec of event.characters) {
        const key = `${ec.characterId}:${event.sortKey}`;
        const list = byCharacterAndSortKey.get(key) ?? [];
        list.push({ eventId: event.id, locationId: event.locationId });
        byCharacterAndSortKey.set(key, list);
      }
    }
    for (const [key, occurrences] of byCharacterAndSortKey) {
      const distinctLocations = new Set(occurrences.map((o) => o.locationId).filter(Boolean));
      if (distinctLocations.size > 1) {
        const [characterId] = key.split(':');
        const character = events
          .flatMap((e) => e.characters)
          .find((ec) => ec.characterId === characterId)?.character;
        warnings.push({
          type: 'SAME_TIME_DIFFERENT_PLACE',
          message: `${character?.name ?? 'Un personaje'} aparece en el mismo momento en lugares distintos`,
          eventIds: occurrences.map((o) => o.eventId),
        });
      }
    }

    return warnings;
  }

  private async requireEvent(eventId: string) {
    const event = await this.prisma.timelineEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }
}
