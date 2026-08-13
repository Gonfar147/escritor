import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { AiProposalType } from '@prisma/client';
import { ResolveProposalDto } from './dto/ai-proposal.dto';
import {
  StructureProposalContent,
  StructureDiscoveryContent,
  ActProposalContent,
  SequenceProposalContent,
  ChapterProposalContent,
  CharacterArcProposalContent,
  ReorganizationProposalContent,
  ProposedAct,
  ProposedChapter,
} from './proposal-content.types';

/**
 * Las propuestas de IA viven completamente separadas de la arquitectura real
 * (puntos 19/20/25 del prompt): esta tabla nunca es la fuente de verdad de la
 * novela. "Aplicar" una propuesta significa leer su JSON y, recién ahí, crear/
 * actualizar filas reales en Part/Sequence/Chapter/CharacterArc/etc. `content`
 * (lo que propuso la IA) nunca se edita; si el autor acepta con cambios, eso
 * queda aparte en `appliedContent`, para poder comparar después qué sugirió la
 * IA contra qué terminó siendo la novela.
 */
@Injectable()
export class AiProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async listForProject(userId: string, projectId: string, status?: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.aiProposal.findMany({
      where: { projectId, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, proposalId: string) {
    const proposal = await this.requireProposal(proposalId);
    await this.access.assertMember(userId, proposal.projectId);
    return proposal;
  }

  async resolve(userId: string, proposalId: string, dto: ResolveProposalDto) {
    const proposal = await this.requireProposal(proposalId);
    await this.access.assertRole(userId, proposal.projectId, ProjectAccessService.WRITE_ROLES);

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('Esta propuesta ya fue resuelta');
    }

    if (dto.status === 'REJECTED') {
      return this.prisma.aiProposal.update({
        where: { id: proposalId },
        data: { status: 'REJECTED', resolvedAt: new Date() },
      });
    }

    // ACCEPTED o MODIFIED: se aplica el contenido correspondiente a la arquitectura real.
    const contentToApply = dto.appliedContent ?? (proposal.content as any);
    await this.apply(proposal.projectId, proposal.type, contentToApply);

    return this.prisma.aiProposal.update({
      where: { id: proposalId },
      data: {
        status: dto.status,
        appliedContent: dto.appliedContent ?? undefined,
        resolvedAt: new Date(),
      },
    });
  }

  private async requireProposal(proposalId: string) {
    const proposal = await this.prisma.aiProposal.findUnique({ where: { id: proposalId } });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada');
    return proposal;
  }

  // ---- Aplicar: content JSON -> filas reales ----

  private async apply(projectId: string, type: AiProposalType, content: any): Promise<void> {
    switch (type) {
      case 'FULL_STRUCTURE':
        return this.applyFullStructure(projectId, content as StructureProposalContent);
      case 'STRUCTURE_DISCOVERY':
        return this.applyStructureDiscovery(projectId, content as StructureDiscoveryContent);
      case 'ACT_STRUCTURE':
        return this.applyAct(projectId, content as ActProposalContent);
      case 'SEQUENCE':
        return this.applySequence(content as SequenceProposalContent);
      case 'CHAPTER':
        return this.applyChapter(content as ChapterProposalContent);
      case 'CHARACTER_ARC':
        return this.applyCharacterArc(content as CharacterArcProposalContent);
      case 'REORGANIZATION':
        return this.applyReorganization(projectId, content as ReorganizationProposalContent);
      case 'COHERENCE_ANALYSIS':
        return; // informativa: no crea ni modifica nada por sí sola
      case 'OTHER':
        return; // sin efecto automático definido; queda registrada igual
    }
  }

  private async applyFullStructure(projectId: string, content: StructureProposalContent) {
    const label = content.actLabel ?? 'Acto';
    let partOrder = await this.prisma.part.count({ where: { projectId } });

    for (const act of content.acts) {
      const part = await this.prisma.part.create({
        data: {
          projectId,
          title: act.title,
          order: partOrder++,
          label,
          narrativeFunction: act.narrativeFunction,
          objective: act.objective,
          conflict: act.conflict,
        },
      });
      await this.createActChildren(part.id, act);
    }
  }

  /**
   * A diferencia de applyFullStructure, NO crea capítulos nuevos: crea los Actos/
   * Secuencias nuevos y MUEVE ahí los capítulos existentes referenciados por id.
   * Los `chapterFieldSuggestions` solo se aplican a campos que el capítulo todavía
   * tiene vacíos — nunca pisa lo que el autor ya escribió.
   */
  private async applyStructureDiscovery(projectId: string, content: StructureDiscoveryContent) {
    const label = content.actLabel ?? 'Acto';
    let partOrder = await this.prisma.part.count({ where: { projectId } });

    for (const act of content.acts) {
      const part = await this.prisma.part.create({
        data: {
          projectId,
          title: act.title,
          order: partOrder++,
          label,
          narrativeFunction: act.narrativeFunction,
          objective: act.objective,
          conflict: act.conflict,
        },
      });

      if (act.sequences?.length) {
        let sequenceOrder = 0;
        for (const seq of act.sequences) {
          const sequence = await this.prisma.sequence.create({
            data: {
              partId: part.id,
              title: seq.title,
              order: sequenceOrder++,
              narrativeFunction: seq.narrativeFunction,
              objective: seq.objective,
            },
          });
          await this.moveExistingChapters(seq.chapterIds, part.id, sequence.id, projectId);
        }
      }

      if (act.chapterIds?.length) {
        await this.moveExistingChapters(act.chapterIds, part.id, undefined, projectId);
      }
    }

    for (const suggestion of content.chapterFieldSuggestions ?? []) {
      const chapter = await this.prisma.chapter.findFirst({
        where: { id: suggestion.chapterId, part: { projectId } },
      });
      if (!chapter) continue;

      const data: Record<string, string> = {};
      if (!chapter.narrativeFunction && suggestion.narrativeFunction) data.narrativeFunction = suggestion.narrativeFunction;
      if (!chapter.objective && suggestion.objective) data.objective = suggestion.objective;
      if (!chapter.conflict && suggestion.conflict) data.conflict = suggestion.conflict;
      if (!chapter.change && suggestion.change) data.change = suggestion.change;
      if (!chapter.hook && suggestion.hook) data.hook = suggestion.hook;

      if (Object.keys(data).length > 0) {
        await this.prisma.chapter.update({ where: { id: chapter.id }, data });
      }
    }
  }

  private async moveExistingChapters(chapterIds: string[], partId: string, sequenceId: string | undefined, projectId: string) {
    let order = 0;
    for (const chapterId of chapterIds) {
      // Se valida que el capítulo sea del mismo proyecto antes de moverlo, para que una
      // propuesta corrupta/manipulada no pueda mover contenido de otra novela.
      const chapter = await this.prisma.chapter.findFirst({ where: { id: chapterId, part: { projectId } } });
      if (!chapter) continue;
      await this.prisma.chapter.update({
        where: { id: chapterId },
        data: { partId, sequenceId: sequenceId ?? null, order: order++ },
      });
    }
  }

  private async applyAct(projectId: string, content: ActProposalContent) {
    const partOrder = await this.prisma.part.count({ where: { projectId } });
    const part = await this.prisma.part.create({
      data: {
        projectId,
        title: content.act.title,
        order: partOrder,
        narrativeFunction: content.act.narrativeFunction,
        objective: content.act.objective,
        conflict: content.act.conflict,
      },
    });
    await this.createActChildren(part.id, content.act);
  }

  private async createActChildren(partId: string, act: ProposedAct) {
    let chapterOrder = 0;

    if (act.sequences?.length) {
      let sequenceOrder = 0;
      for (const seq of act.sequences) {
        const sequence = await this.prisma.sequence.create({
          data: {
            partId,
            title: seq.title,
            order: sequenceOrder++,
            narrativeFunction: seq.narrativeFunction,
            objective: seq.objective,
          },
        });
        for (const chapter of seq.chapters) {
          await this.createChapter(partId, chapter, chapterOrder++, sequence.id);
        }
      }
    }

    if (act.chapters?.length) {
      for (const chapter of act.chapters) {
        await this.createChapter(partId, chapter, chapterOrder++);
      }
    }
  }

  private async applySequence(content: SequenceProposalContent) {
    const part = await this.prisma.part.findUnique({ where: { id: content.partId } });
    if (!part) throw new NotFoundException('La Parte destino de la secuencia ya no existe');

    const order = await this.prisma.sequence.count({ where: { partId: content.partId } });
    const sequence = await this.prisma.sequence.create({
      data: {
        partId: content.partId,
        title: content.sequence.title,
        order,
        narrativeFunction: content.sequence.narrativeFunction,
        objective: content.sequence.objective,
      },
    });

    let chapterOrder = 0;
    for (const chapter of content.sequence.chapters) {
      await this.createChapter(content.partId, chapter, chapterOrder++, sequence.id);
    }
  }

  private async applyChapter(content: ChapterProposalContent) {
    const part = await this.prisma.part.findUnique({ where: { id: content.partId } });
    if (!part) throw new NotFoundException('La Parte destino del capítulo ya no existe');

    const order = await this.prisma.chapter.count({ where: { partId: content.partId } });
    await this.createChapter(content.partId, content.chapter, order, content.sequenceId);
  }

  private async createChapter(partId: string, chapter: ProposedChapter, order: number, sequenceId?: string) {
    return this.prisma.chapter.create({
      data: {
        partId,
        sequenceId,
        title: chapter.title,
        order,
        narrativeFunction: chapter.narrativeFunction,
        objective: chapter.objective,
        conflict: chapter.conflict,
        change: chapter.change,
        infoToReveal: chapter.infoToReveal,
        infoToProtect: chapter.infoToProtect,
        hook: chapter.hook,
      },
    });
  }

  private async applyCharacterArc(content: CharacterArcProposalContent) {
    const character = await this.prisma.character.findUnique({ where: { id: content.characterId } });
    if (!character) throw new NotFoundException('El personaje ya no existe');

    await this.prisma.characterArc.upsert({
      where: { characterId: content.characterId },
      create: { characterId: content.characterId, ...content.arc },
      update: content.arc,
    });
  }

  private async applyReorganization(projectId: string, content: ReorganizationProposalContent) {
    for (const move of content.moves) {
      const chapter = await this.prisma.chapter.findUnique({ where: { id: move.chapterId } });
      if (!chapter) continue; // el capítulo pudo haberse borrado entre que se generó la propuesta y se aceptó
      const targetPart = await this.prisma.part.findFirst({ where: { id: move.targetPartId, projectId } });
      if (!targetPart) continue;

      const order = move.order ?? (await this.prisma.chapter.count({ where: { partId: move.targetPartId } }));
      await this.prisma.chapter.update({
        where: { id: move.chapterId },
        data: { partId: move.targetPartId, sequenceId: move.targetSequenceId ?? null, order },
      });
    }
  }
}
