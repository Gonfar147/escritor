import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { UpsertVisionDto, UpsertCharacterArcDto } from './dto/vision-arc.dto';

@Injectable()
export class VisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  /** Siempre devuelve algo (nunca 404): una novela sin Visión definida todavía es un estado válido, no un error. */
  async get(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);
    return this.prisma.novelVision.findUnique({ where: { projectId } });
  }

  async upsert(userId: string, projectId: string, dto: UpsertVisionDto) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    if (dto.protagonistCharacterId) {
      const character = await this.prisma.character.findFirst({
        where: { id: dto.protagonistCharacterId, projectId },
      });
      if (!character) throw new NotFoundException('El personaje protagonista no pertenece a este proyecto');
    }

    return this.prisma.novelVision.upsert({
      where: { projectId },
      create: { projectId, ...dto },
      update: dto,
    });
  }
}

@Injectable()
export class CharacterArcService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async get(userId: string, characterId: string) {
    const projectId = await this.projectIdForCharacter(characterId);
    await this.access.assertMember(userId, projectId);
    return this.prisma.characterArc.findUnique({ where: { characterId } });
  }

  async upsert(userId: string, characterId: string, dto: UpsertCharacterArcDto) {
    const projectId = await this.projectIdForCharacter(characterId);
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    return this.prisma.characterArc.upsert({
      where: { characterId },
      create: { characterId, ...dto },
      update: dto,
    });
  }

  private async projectIdForCharacter(characterId: string): Promise<string> {
    const character = await this.prisma.character.findUnique({ where: { id: characterId } });
    if (!character) throw new NotFoundException('Personaje no encontrado');
    return character.projectId;
  }
}
