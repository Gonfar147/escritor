import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ArchitectureController } from './architecture.controller';
import { SequencesService } from './sequences.service';
import { VisionService, CharacterArcService } from './vision-arc.service';
import { ChapterLinksService } from './chapter-links.service';
import { EventCausalityService } from './event-causality.service';
import { AiProposalsService } from './ai-proposals.service';
import { ArchitectureContextService } from './architecture-context.service';
import { ArchitectureAiService } from './architecture-ai.service';
import { ArchitectureAnalysisService } from './architecture-analysis.service';

@Module({
  imports: [AiModule], // reusa AnthropicService (RagService no hace falta acá: no se busca por similitud, se arma contexto directo)
  controllers: [ArchitectureController],
  providers: [
    SequencesService,
    VisionService,
    CharacterArcService,
    ChapterLinksService,
    EventCausalityService,
    AiProposalsService,
    ArchitectureContextService,
    ArchitectureAiService,
    ArchitectureAnalysisService,
  ],
  exports: [ArchitectureContextService],
})
export class ArchitectureModule {}
