import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAccessService } from '../common/project-access.service';
import { AnthropicService } from '../ai/anthropic.service';
import { ArchitectureContextService } from './architecture-context.service';
import { CoherenceAnalysisContent, CoherenceFinding } from './proposal-content.types';

const MIN_SCENES_FOR_ARC_CHECK = 3; // un personaje con menos apariciones que esto no amerita pedir un arco todavía

const AI_SYSTEM_PROMPT = `Sos un editor narrativo. Se te da un resumen estructural de una novela (Visión + Actos/
Secuencias/Capítulos, con sus campos de función/objetivo/conflicto/cambio ya completados por el autor donde existan).
Buscá específicamente:
- conflicto central ausente por demasiados capítulos seguidos;
- información que parece revelarse demasiado pronto según lo planificado;
- el objetivo de un acto que no parece cumplirse en ninguno de sus capítulos;
- posibles contradicciones entre la Visión y lo que describen los capítulos;
- capítulos cuyo objetivo/conflicto no encaja con el conflicto central de la novela.

No repitas problemas obvios de campos vacíos (eso ya se detecta aparte). Si no encontrás nada relevante, devolvé una
lista vacía — no inventes problemas para tener algo que decir.

Respondé ÚNICAMENTE con JSON válido, sin texto antes ni después, sin bloques de markdown. Forma exacta:
{
  "findings": [
    { "severity": "info" | "warning" | "issue", "title": "string breve", "explanation": "string", "suggestion": "string opcional" }
  ]
}`;

@Injectable()
export class ArchitectureAnalysisService {
  private readonly logger = new Logger(ArchitectureAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly anthropic: AnthropicService,
    private readonly context: ArchitectureContextService,
  ) {}

  async analyze(userId: string, projectId: string) {
    await this.access.assertMember(userId, projectId);

    const [deterministic, aiFindings] = await Promise.all([
      this.runDeterministicChecks(projectId),
      this.runAiPass(projectId).catch((err) => {
        this.logger.warn(`Pasada de IA del análisis de coherencia falló — ${err?.message ?? err}`);
        return [] as CoherenceFinding[];
      }),
    ]);

    const content: CoherenceAnalysisContent = {
      findings: [...deterministic, ...aiFindings],
      summary: `${deterministic.length + aiFindings.length} hallazgo(s): ${deterministic.length} determinístico(s), ${aiFindings.length} de IA.`,
    };

    return this.prisma.aiProposal.create({
      data: {
        projectId,
        type: 'COHERENCE_ANALYSIS',
        status: 'PENDING',
        content: content as any,
        contextSummary: 'Análisis de coherencia sobre la arquitectura actual',
      },
    });
  }

  // ---- Checks determinísticos: cálculos exactos sobre datos estructurados, sin IA ----

  private async runDeterministicChecks(projectId: string): Promise<CoherenceFinding[]> {
    const findings: CoherenceFinding[] = [];

    const chapters = await this.prisma.chapter.findMany({
      where: { part: { projectId } },
      orderBy: [{ part: { order: 'asc' } }, { order: 'asc' }],
      select: { id: true, title: true, narrativeFunction: true, objective: true, change: true, part: { select: { title: true } } },
    });

    const withoutFunction = chapters.filter((c) => !c.narrativeFunction);
    if (withoutFunction.length > 0) {
      findings.push({
        severity: 'info',
        title: `${withoutFunction.length} capítulo(s) sin función narrativa definida`,
        explanation: 'Todavía no tienen completado "¿qué función cumple este capítulo dentro de la historia?".',
        suggestion: 'No es obligatorio, pero completar la función narrativa ayuda a detectar capítulos que no aportan.',
      });
    }

    const withoutChange = chapters.filter((c) => !c.change);
    if (withoutChange.length >= 3) {
      findings.push({
        severity: 'warning',
        title: `${withoutChange.length} capítulos sin un cambio definido`,
        explanation:
          'Un capítulo sin nada que cambie entre su comienzo y su final suele sentirse de relleno. Puede ser intencional, pero vale la pena revisarlo.',
        suggestion: 'Completá el campo "Cambio" de esos capítulos, o revisá si de verdad hacen avanzar la historia.',
      });
    }

    // Acontecimientos totalmente aislados: ni provocan ni son provocados por nada.
    const events = await this.prisma.timelineEvent.findMany({
      where: { projectId },
      select: { id: true, title: true, _count: { select: { causesFrom: true, causesTo: true } } },
    });
    const isolated = events.filter((e) => e._count.causesFrom === 0 && e._count.causesTo === 0);
    if (isolated.length > 0 && events.length > 1) {
      findings.push({
        severity: 'info',
        title: `${isolated.length} acontecimiento(s) sin causa ni consecuencia conectada`,
        explanation: `${isolated.map((e) => `"${e.title}"`).join(', ')} no tienen ningún vínculo causal con otro acontecimiento de la línea temporal.`,
        suggestion: 'Si de verdad no provocan ni son provocados por nada, puede que no aporten a la trama — o simplemente falte vincularlos.',
      });
    }

    // Personajes vivos con muchas apariciones pero sin arco estructurado.
    const characters = await this.prisma.character.findMany({
      where: { projectId, status: 'ALIVE' },
      select: { id: true, name: true, structuredArc: true, _count: { select: { sceneAppearances: true } } },
    });
    const noArc = characters.filter((c) => c._count.sceneAppearances >= MIN_SCENES_FOR_ARC_CHECK && !c.structuredArc);
    if (noArc.length > 0) {
      findings.push({
        severity: 'info',
        title: `${noArc.length} personaje(s) sin arco definido pese a aparecer seguido`,
        explanation: `${noArc.map((c) => c.name).join(', ')} aparece(n) en varias escenas pero todavía no tiene(n) un Arco de personaje completado en Arquitectura.`,
        suggestion: 'No todo personaje necesita un arco — pero si tiene peso en la trama, vale la pena definir cómo cambia.',
        relatedEntity: noArc.length === 1 ? { type: 'CHARACTER', id: noArc[0].id, title: noArc[0].name } : undefined,
      });
    }

    return findings;
  }

  // ---- Pasada de IA: lo que sí requiere comprensión de lenguaje ----

  private async runAiPass(projectId: string): Promise<CoherenceFinding[]> {
    const overview = await this.context.projectOverview(projectId);
    const raw = await this.anthropic.complete([{ role: 'user', content: overview }], {
      system: AI_SYSTEM_PROMPT,
      maxTokens: 2000,
    });

    const cleaned = raw.replace(/^```json\s*|^```\s*|```\s*$/gm, '').trim();
    try {
      const parsed = JSON.parse(cleaned) as { findings: CoherenceFinding[] };
      return parsed.findings ?? [];
    } catch (err) {
      this.logger.warn(`No se pudo parsear el análisis de IA como JSON: ${(err as Error).message}`);
      return [];
    }
  }
}
