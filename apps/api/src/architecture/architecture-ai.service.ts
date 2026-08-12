import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { AnthropicService } from '../ai/anthropic.service';
import { ArchitectureContextService } from './architecture-context.service';
import { StructureProposalContent, StructureDiscoveryContent } from './proposal-content.types';

const CONSTRUCT_SYSTEM_PROMPT = `Sos un asistente de arquitectura narrativa. El autor te da ideas sueltas para su novela
y vos proponés una posible estructura de Actos (con Capítulos, y Secuencias si tiene sentido).

Reglas:
- NO inventes teorías narrativas rígidas (nada de "estructura de 3 actos obligatoria" salvo que el propio autor la sugiera).
- La cantidad de actos/capítulos depende de las ideas dadas, no de una plantilla fija.
- Cada capítulo debe tener título y, si es posible, función narrativa/objetivo/conflicto/qué cambia/gancho — pero mejor dejar un campo vacío que inventar relleno sin sentido.
- Explicá brevemente el razonamiento en "reasoning".
- Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin bloques de markdown. Forma exacta:
{
  "actLabel": "Acto",
  "reasoning": "string",
  "acts": [
    {
      "title": "string",
      "narrativeFunction": "string opcional",
      "objective": "string opcional",
      "conflict": "string opcional",
      "chapters": [
        { "title": "string", "narrativeFunction": "string opcional", "objective": "string opcional", "conflict": "string opcional", "change": "string opcional", "hook": "string opcional" }
      ]
    }
  ]
}`;

const DISCOVER_SYSTEM_PROMPT = `Sos un asistente de arquitectura narrativa. Se te da el manuscrito YA ESCRITO de una
novela (capítulos con su id real y un resumen de sus escenas) y proponés una posible organización en Actos
(y Secuencias si tiene sentido), agrupando los capítulos EXISTENTES por su id — nunca inventes capítulos nuevos.

Reglas:
- Usá exactamente los ids de capítulo que te dieron, uno de ellos por línea, sin inventar ni omitir sin avisar en "reasoning".
- Si detectás qué función narrativa/objetivo/conflicto/cambio/gancho parece tener cada capítulo, sugerilo en "chapterFieldSuggestions" — pero solo si de verdad se puede inferir del texto, no rellenes por rellenar.
- Presentá esto como una PROPUESTA detectada, no una verdad absoluta (así lo va a ver el autor).
- Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin bloques de markdown. Forma exacta:
{
  "actLabel": "Acto",
  "reasoning": "string",
  "acts": [
    {
      "title": "string",
      "narrativeFunction": "string opcional",
      "objective": "string opcional",
      "chapterIds": ["id1", "id2"]
    }
  ],
  "chapterFieldSuggestions": [
    { "chapterId": "id1", "narrativeFunction": "string opcional", "objective": "string opcional", "conflict": "string opcional", "change": "string opcional", "hook": "string opcional" }
  ]
}`;

@Injectable()
export class ArchitectureAiService {
  private readonly logger = new Logger(ArchitectureAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly anthropic: AnthropicService,
    private readonly context: ArchitectureContextService,
  ) {}

  /** "Construir con IA" (punto 19): a partir de ideas sueltas, propone una estructura completa nueva. */
  async constructFromIdeas(userId: string, projectId: string, prompt: string) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const overview = await this.context.projectOverview(projectId);
    const userPrompt = `${overview}\n\n--- Ideas del autor ---\n${prompt}\n\nProponé una estructura.`;

    const raw = await this.anthropic.complete([{ role: 'user', content: userPrompt }], {
      system: CONSTRUCT_SYSTEM_PROMPT,
      maxTokens: 3000,
    });

    const content = parseJsonResponse<StructureProposalContent>(raw, this.logger);
    if (!content?.acts?.length) {
      throw new BadRequestException('La IA no pudo generar una propuesta de estructura a partir de esas ideas. Probá reformularlas con más detalle.');
    }

    return this.prisma.aiProposal.create({
      data: {
        projectId,
        type: 'FULL_STRUCTURE',
        content: content as any,
        contextSummary: `Ideas del autor: ${prompt}`.slice(0, 2000),
      },
    });
  }

  /** "Analizar estructura existente" (punto 20): agrupa los capítulos ya escritos en una posible arquitectura. */
  async discoverStructure(userId: string, projectId: string) {
    await this.access.assertRole(userId, projectId, ProjectAccessService.WRITE_ROLES);

    const chapterCount = await this.prisma.chapter.count({ where: { part: { projectId } } });
    if (chapterCount === 0) {
      throw new BadRequestException('Todavía no hay capítulos escritos para analizar. Probá "Construir con IA" en cambio.');
    }

    const summary = await this.context.manuscriptSummaryWithIds(projectId);
    const userPrompt = `${summary}\n\nAnalizá esta novela y proponé una organización estructural.`;

    const raw = await this.anthropic.complete([{ role: 'user', content: userPrompt }], {
      system: DISCOVER_SYSTEM_PROMPT,
      maxTokens: 4000,
    });

    const content = parseJsonResponse<StructureDiscoveryContent>(raw, this.logger);
    if (!content?.acts?.length) {
      throw new BadRequestException('La IA no pudo detectar una estructura a partir del manuscrito actual.');
    }

    return this.prisma.aiProposal.create({
      data: {
        projectId,
        type: 'STRUCTURE_DISCOVERY',
        content: content as any,
        contextSummary: `Análisis automático de ${chapterCount} capítulo(s) existentes.`,
      },
    });
  }
}

/** Claude a veces envuelve el JSON en ```json ... ``` pese a la instrucción — se limpia antes de parsear. */
function parseJsonResponse<T>(raw: string, logger: Logger): T | null {
  const cleaned = raw.replace(/^```json\s*|^```\s*|```\s*$/gm, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    logger.warn(`No se pudo parsear la respuesta de la IA como JSON: ${(err as Error).message}`);
    return null;
  }
}
