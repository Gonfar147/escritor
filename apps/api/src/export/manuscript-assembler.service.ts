import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { Block, tiptapToBlocks } from './tiptap-to-blocks.util';

export interface ManuscriptScene {
  id: string;
  title: string;
  blocks: Block[];
}

export interface ManuscriptChapter {
  id: string;
  title: string;
  scenes: ManuscriptScene[];
}

export interface ManuscriptPart {
  id: string;
  title: string;
  chapters: ManuscriptChapter[];
}

export interface Manuscript {
  title: string;
  subtitle: string | null;
  author: string;
  synopsis: string | null;
  parts: ManuscriptPart[];
}

export interface ExportOptions {
  includeSceneTitles: boolean; // mostrar el título de cada escena como subtítulo, o solo el texto corrido
  includePartTitles: boolean; // si un proyecto tiene una sola Parte "genérica", suele convenir ocultarla
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeSceneTitles: false,
  includePartTitles: true,
};

@Injectable()
export class ManuscriptAssembler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async assemble(userId: string, projectId: string): Promise<Manuscript> {
    await this.access.assertMember(userId, projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { where: { role: 'OWNER' }, include: { user: true }, take: 1 },
        parts: {
          orderBy: { order: 'asc' },
          include: {
            chapters: {
              orderBy: { order: 'asc' },
              include: {
                scenes: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Proyecto no encontrado');

    return {
      title: project.title,
      subtitle: project.subtitle,
      author: project.members[0]?.user.name ?? '',
      synopsis: project.synopsis,
      parts: project.parts.map((part) => ({
        id: part.id,
        title: part.title,
        chapters: part.chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          scenes: chapter.scenes.map((scene) => ({
            id: scene.id,
            title: scene.title,
            blocks: tiptapToBlocks(scene.content),
          })),
        })),
      })),
    };
  }
}
