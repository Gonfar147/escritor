import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';

export interface ForgottenCharacter {
  id: string;
  name: string;
  status: string;
  sceneCount: number;
  scenesSinceLastAppearance: number | null; // null = nunca apareció en ninguna escena
  lastAppearance: { sceneId: string; sceneTitle: string } | null;
}

/**
 * Chequeos de consistencia narrativa. La detección de "personaje olvidado" es
 * determinística (orden narrativo real: Parte > Capítulo > Escena), no delegada
 * a un LLM — mismo criterio que el conteo de palabras: es un cálculo exacto
 * sobre datos estructurados, no una tarea de comprensión de lenguaje.
 */
@Injectable()
export class ConsistencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async forgottenCharacters(userId: string, projectId: string, threshold = 10): Promise<ForgottenCharacter[]> {
    await this.access.assertMember(userId, projectId);

    const scenes = await this.prisma.scene.findMany({
      where: { chapter: { part: { projectId } } },
      select: {
        id: true,
        title: true,
        order: true,
        chapter: { select: { order: true, part: { select: { order: true } } } },
        characterAppearances: { select: { characterId: true } },
      },
      orderBy: [
        { chapter: { part: { order: 'asc' } } },
        { chapter: { order: 'asc' } },
        { order: 'asc' },
      ],
    });

    const totalScenes = scenes.length;
    const lastSceneIndexByCharacter = new Map<string, number>();
    const sceneCountByCharacter = new Map<string, number>();

    scenes.forEach((scene: (typeof scenes)[number], index: number) => {
      for (const appearance of scene.characterAppearances) {
        lastSceneIndexByCharacter.set(appearance.characterId, index);
        sceneCountByCharacter.set(appearance.characterId, (sceneCountByCharacter.get(appearance.characterId) ?? 0) + 1);
      }
    });

    const characters = await this.prisma.character.findMany({
      where: { projectId, status: 'ALIVE' }, // personajes muertos/desaparecidos no ausentarse no es una inconsistencia
      select: { id: true, name: true, status: true },
      orderBy: { name: 'asc' },
    });

    const results: ForgottenCharacter[] = [];

    for (const character of characters) {
      const lastIndex = lastSceneIndexByCharacter.get(character.id);
      const sceneCount = sceneCountByCharacter.get(character.id) ?? 0;

      if (lastIndex === undefined) {
        // Existe en el codex pero nunca fue escrito en ninguna escena todavía.
        // Solo se marca si ya hay contenido suficiente como para que sea significativo.
        if (totalScenes >= threshold) {
          results.push({
            id: character.id,
            name: character.name,
            status: character.status,
            sceneCount: 0,
            scenesSinceLastAppearance: null,
            lastAppearance: null,
          });
        }
        continue;
      }

      const scenesSince = totalScenes - lastIndex - 1;
      if (scenesSince >= threshold) {
        results.push({
          id: character.id,
          name: character.name,
          status: character.status,
          sceneCount,
          scenesSinceLastAppearance: scenesSince,
          lastAppearance: { sceneId: scenes[lastIndex].id, sceneTitle: scenes[lastIndex].title },
        });
      }
    }

    return results.sort((a, b) => (b.scenesSinceLastAppearance ?? Infinity) - (a.scenesSinceLastAppearance ?? Infinity));
  }
}
