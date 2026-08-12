import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SequencesService } from './sequences.service';
import { VisionService, CharacterArcService } from './vision-arc.service';
import { ChapterLinksService } from './chapter-links.service';
import { EventCausalityService } from './event-causality.service';
import { AiProposalsService } from './ai-proposals.service';
import { ArchitectureAiService } from './architecture-ai.service';
import { ArchitectureAnalysisService } from './architecture-analysis.service';
import { CreateSequenceDto, UpdateSequenceDto, ReorderSequencesDto, MoveSequenceDto } from './dto/sequence.dto';
import { UpsertVisionDto, UpsertCharacterArcDto } from './dto/vision-arc.dto';
import { LinkChapterCharacterDto, LinkChapterLocationDto } from './dto/chapter-link.dto';
import { CreateEventCausalityDto } from './dto/event-causality.dto';
import { ResolveProposalDto, ConstructWithAiDto } from './dto/ai-proposal.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ArchitectureController {
  constructor(
    private readonly sequences: SequencesService,
    private readonly vision: VisionService,
    private readonly characterArc: CharacterArcService,
    private readonly chapterLinks: ChapterLinksService,
    private readonly causality: EventCausalityService,
    private readonly proposals: AiProposalsService,
    private readonly architectureAi: ArchitectureAiService,
    private readonly analysis: ArchitectureAnalysisService,
  ) {}

  // ---- Visión ----

  @Get('projects/:projectId/architecture/vision')
  getVision(@Req() req: any, @Param('projectId') projectId: string) {
    return this.vision.get(req.user.userId, projectId);
  }

  @Put('projects/:projectId/architecture/vision')
  upsertVision(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: UpsertVisionDto) {
    return this.vision.upsert(req.user.userId, projectId, dto);
  }

  // ---- Arco de personaje ----

  @Get('characters/:characterId/arc')
  getArc(@Req() req: any, @Param('characterId') characterId: string) {
    return this.characterArc.get(req.user.userId, characterId);
  }

  @Put('characters/:characterId/arc')
  upsertArc(@Req() req: any, @Param('characterId') characterId: string, @Body() dto: UpsertCharacterArcDto) {
    return this.characterArc.upsert(req.user.userId, characterId, dto);
  }

  // ---- Secuencias ----

  @Post('parts/:partId/sequences')
  createSequence(@Req() req: any, @Param('partId') partId: string, @Body() dto: CreateSequenceDto) {
    return this.sequences.create(req.user.userId, partId, dto);
  }

  @Get('parts/:partId/sequences')
  listSequences(@Req() req: any, @Param('partId') partId: string) {
    return this.sequences.findAll(req.user.userId, partId);
  }

  @Post('parts/:partId/sequences/reorder')
  reorderSequences(@Req() req: any, @Param('partId') partId: string, @Body() dto: ReorderSequencesDto) {
    return this.sequences.reorder(req.user.userId, partId, dto);
  }

  @Post('sequences/:id/move')
  moveSequence(@Req() req: any, @Param('id') id: string, @Body() dto: MoveSequenceDto) {
    return this.sequences.move(req.user.userId, id, dto);
  }

  @Put('sequences/:id')
  updateSequence(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSequenceDto) {
    return this.sequences.update(req.user.userId, id, dto);
  }

  @Delete('sequences/:id')
  removeSequence(@Req() req: any, @Param('id') id: string) {
    return this.sequences.remove(req.user.userId, id);
  }

  @Post('chapters/:chapterId/sequence/detach')
  detachChapterFromSequence(@Req() req: any, @Param('chapterId') chapterId: string) {
    return this.sequences.detachChapter(req.user.userId, chapterId);
  }

  @Post('chapters/:chapterId/sequence/:sequenceId')
  attachChapterToSequence(@Req() req: any, @Param('chapterId') chapterId: string, @Param('sequenceId') sequenceId: string) {
    return this.sequences.attachChapter(req.user.userId, chapterId, sequenceId);
  }

  // ---- Vínculos de planificación a nivel capítulo ----

  @Post('chapters/:chapterId/characters')
  linkChapterCharacter(@Req() req: any, @Param('chapterId') chapterId: string, @Body() dto: LinkChapterCharacterDto) {
    return this.chapterLinks.linkCharacter(req.user.userId, chapterId, dto);
  }

  @Delete('chapters/:chapterId/characters/:characterId')
  unlinkChapterCharacter(@Req() req: any, @Param('chapterId') chapterId: string, @Param('characterId') characterId: string) {
    return this.chapterLinks.unlinkCharacter(req.user.userId, chapterId, characterId);
  }

  @Post('chapters/:chapterId/locations')
  linkChapterLocation(@Req() req: any, @Param('chapterId') chapterId: string, @Body() dto: LinkChapterLocationDto) {
    return this.chapterLinks.linkLocation(req.user.userId, chapterId, dto);
  }

  @Delete('chapters/:chapterId/locations/:locationId')
  unlinkChapterLocation(@Req() req: any, @Param('chapterId') chapterId: string, @Param('locationId') locationId: string) {
    return this.chapterLinks.unlinkLocation(req.user.userId, chapterId, locationId);
  }

  // ---- Causalidad entre acontecimientos ----

  @Get('projects/:projectId/architecture/causality')
  listCausality(@Req() req: any, @Param('projectId') projectId: string) {
    return this.causality.listForProject(req.user.userId, projectId);
  }

  @Post('architecture/causality')
  createCausality(@Req() req: any, @Body() dto: CreateEventCausalityDto) {
    return this.causality.create(req.user.userId, dto);
  }

  @Delete('architecture/causality/:id')
  removeCausality(@Req() req: any, @Param('id') id: string) {
    return this.causality.remove(req.user.userId, id);
  }

  // ---- Propuestas de IA ----

  @Get('projects/:projectId/architecture/proposals')
  listProposals(@Req() req: any, @Param('projectId') projectId: string, @Query('status') status?: string) {
    return this.proposals.listForProject(req.user.userId, projectId, status);
  }

  @Get('architecture/proposals/:id')
  getProposal(@Req() req: any, @Param('id') id: string) {
    return this.proposals.get(req.user.userId, id);
  }

  @Post('architecture/proposals/:id/resolve')
  resolveProposal(@Req() req: any, @Param('id') id: string, @Body() dto: ResolveProposalDto) {
    return this.proposals.resolve(req.user.userId, id, dto);
  }

  // ---- Construir con IA / Analizar estructura existente / Ver análisis ----

  @Post('projects/:projectId/architecture/construct-with-ai')
  constructWithAi(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: ConstructWithAiDto) {
    return this.architectureAi.constructFromIdeas(req.user.userId, projectId, dto.prompt);
  }

  @Post('projects/:projectId/architecture/discover-structure')
  discoverStructure(@Req() req: any, @Param('projectId') projectId: string) {
    return this.architectureAi.discoverStructure(req.user.userId, projectId);
  }

  @Post('projects/:projectId/architecture/analyze')
  analyze(@Req() req: any, @Param('projectId') projectId: string) {
    return this.analysis.analyze(req.user.userId, projectId);
  }
}
