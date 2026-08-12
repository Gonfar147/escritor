import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotesService } from './notes.service';
import { NoteGroupsService } from './note-groups.service';
import { NotesAiService } from './notes-ai.service';
import {
  CreateNoteDto,
  UpdateNoteDto,
  MoveNoteDto,
  SetNoteTagsDto,
  SetNoteRelationsDto,
  CreateNoteGroupDto,
  UpdateNoteGroupDto,
  ThinkWithNotesDto,
  QueryIdeasDto,
  SaveInsightAsNoteDto,
} from './dto/note.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class NotesController {
  constructor(
    private readonly notes: NotesService,
    private readonly groups: NoteGroupsService,
    private readonly notesAi: NotesAiService,
  ) {}

  // ---- Notas ----

  @Post('projects/:projectId/notes')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateNoteDto) {
    return this.notes.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/notes')
  findAll(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query('groupId') groupId?: string,
    @Query('tag') tag?: string,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
  ) {
    return this.notes.findAll(req.user.userId, projectId, { groupId, tag, status, entityType, entityId, search });
  }

  @Get('notes/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.notes.findOne(req.user.userId, id);
  }

  @Put('notes/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.notes.update(req.user.userId, id, dto);
  }

  @Delete('notes/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.notes.remove(req.user.userId, id);
  }

  @Post('notes/:id/move')
  move(@Req() req: any, @Param('id') id: string, @Body() dto: MoveNoteDto) {
    return this.notes.move(req.user.userId, id, dto);
  }

  @Put('notes/:id/tags')
  setTags(@Req() req: any, @Param('id') id: string, @Body() dto: SetNoteTagsDto) {
    return this.notes.setTags(req.user.userId, id, dto);
  }

  @Put('notes/:id/relations')
  setRelations(@Req() req: any, @Param('id') id: string, @Body() dto: SetNoteRelationsDto) {
    return this.notes.setRelations(req.user.userId, id, dto);
  }

  // ---- Grupos ----

  @Post('projects/:projectId/note-groups')
  createGroup(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateNoteGroupDto) {
    return this.groups.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/note-groups')
  listGroups(@Req() req: any, @Param('projectId') projectId: string, @Query('includeArchived') includeArchived?: string) {
    return this.groups.findAll(req.user.userId, projectId, includeArchived === 'true');
  }

  @Put('note-groups/:id')
  updateGroup(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateNoteGroupDto) {
    return this.groups.update(req.user.userId, id, dto);
  }

  @Delete('note-groups/:id')
  removeGroup(@Req() req: any, @Param('id') id: string) {
    return this.groups.remove(req.user.userId, id);
  }

  // ---- IA ----

  @Post('projects/:projectId/notes/think')
  thinkWithNotes(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: ThinkWithNotesDto) {
    return this.notesAi.thinkWithNotes(req.user.userId, projectId, dto);
  }

  @Post('projects/:projectId/notes/query')
  queryIdeas(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: QueryIdeasDto) {
    return this.notesAi.queryIdeas(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/notes/ai-proposals')
  listProposals(@Req() req: any, @Param('projectId') projectId: string, @Query('type') type?: string) {
    return this.notesAi.listProposals(req.user.userId, projectId, type);
  }

  @Get('projects/:projectId/notes/ai-proposals/:proposalId')
  getProposal(@Req() req: any, @Param('projectId') projectId: string, @Param('proposalId') proposalId: string) {
    return this.notesAi.getProposal(req.user.userId, projectId, proposalId);
  }

  @Post('projects/:projectId/notes/ai-proposals/:proposalId/save-as-note')
  saveInsightAsNote(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Param('proposalId') proposalId: string,
    @Body() dto: SaveInsightAsNoteDto,
  ) {
    return this.notesAi.saveInsightAsNote(req.user.userId, projectId, proposalId, dto);
  }
}
