import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectAccessService } from '../common/project-access.service';
import { IndexingService } from '../indexing/indexing.service';
import { ChatService } from './chat.service';
import { WritingAssistantService } from './writing-assistant.service';
import { ConsistencyService } from './consistency.service';
import { CreateConversationDto, SendMessageDto } from './dto/chat.dto';
import { ContinueSceneDto, RewriteTextDto, BrainstormDto, DescribeEntityDto } from './dto/assist.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class AiController {
  constructor(
    private readonly access: ProjectAccessService,
    private readonly indexing: IndexingService,
    private readonly chat: ChatService,
    private readonly assistant: WritingAssistantService,
    private readonly consistency: ConsistencyService,
  ) {}

  // ---- Chat ----

  @Post('projects/:projectId/ai/chat/conversations')
  createConversation(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/ai/chat/conversations')
  listConversations(@Req() req: any, @Param('projectId') projectId: string) {
    return this.chat.listConversations(req.user.userId, projectId);
  }

  @Get('ai/chat/conversations/:id')
  getConversation(@Req() req: any, @Param('id') id: string) {
    return this.chat.getConversation(req.user.userId, id);
  }

  @Delete('ai/chat/conversations/:id')
  deleteConversation(@Req() req: any, @Param('id') id: string) {
    return this.chat.deleteConversation(req.user.userId, id);
  }

  @Post('ai/chat/conversations/:id/messages')
  sendMessage(@Req() req: any, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(req.user.userId, id, dto);
  }

  // ---- Asistencia de escritura ----

  @Post('ai/assist/continue')
  continueScene(@Req() req: any, @Body() dto: ContinueSceneDto) {
    return this.assistant.continueScene(req.user.userId, dto);
  }

  @Post('projects/:projectId/ai/assist/rewrite')
  rewriteText(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: RewriteTextDto) {
    return this.assistant.rewriteText(req.user.userId, projectId, dto);
  }

  @Post('projects/:projectId/ai/assist/brainstorm')
  brainstorm(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: BrainstormDto) {
    return this.assistant.brainstorm(req.user.userId, projectId, dto);
  }

  @Post('projects/:projectId/ai/assist/describe')
  describeEntity(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: DescribeEntityDto) {
    return this.assistant.describeEntity(req.user.userId, projectId, dto);
  }

  // ---- Consistencia narrativa ----

  @Get('projects/:projectId/ai/consistency/forgotten-characters')
  forgottenCharacters(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.consistency.forgottenCharacters(req.user.userId, projectId, threshold ? Number(threshold) : undefined);
  }

  // ---- Indexación ----

  @Post('projects/:projectId/ai/reindex')
  async reindex(@Req() req: any, @Param('projectId') projectId: string) {
    await this.access.assertRole(req.user.userId, projectId, ProjectAccessService.WRITE_ROLES);
    const counts = await this.indexing.reindexProject(projectId);
    return { reindexed: counts };
  }
}
