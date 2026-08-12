import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { LinkChapterCharacterDto, LinkChapterLocationDto } from './dto/chapter-link.dto';

@Injectable()
export class ChapterLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async linkCharacter(userId: string, chapterId: string, dto: LinkChapterCharacterDto) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const character = await this.prisma.character.findFirst({ where: { id: dto.characterId, projectId } });
    if (!character) throw new NotFoundException('El personaje no pertenece a este proyecto');

    try {
      return await this.prisma.chapterCharacter.create({
        data: { chapterId, characterId: dto.characterId, role: dto.role },
      });
    } catch {
      throw new ConflictException('Ese personaje ya está vinculado a este capítulo');
    }
  }

  async unlinkCharacter(userId: string, chapterId: string, characterId: string) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    await this.prisma.chapterCharacter.deleteMany({ where: { chapterId, characterId } });
    return { removed: true };
  }

  async linkLocation(userId: string, chapterId: string, dto: LinkChapterLocationDto) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const location = await this.prisma.location.findFirst({ where: { id: dto.locationId, projectId } });
    if (!location) throw new NotFoundException('El lugar no pertenece a este proyecto');

    try {
      return await this.prisma.chapterLocation.create({ data: { chapterId, locationId: dto.locationId } });
    } catch {
      throw new ConflictException('Ese lugar ya está vinculado a este capítulo');
    }
  }

  async unlinkLocation(userId: string, chapterId: string, locationId: string) {
    const projectId = await this.access.projectIdForChapter(chapterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);
    await this.prisma.chapterLocation.deleteMany({ where: { chapterId, locationId } });
    return { removed: true };
  }
}
