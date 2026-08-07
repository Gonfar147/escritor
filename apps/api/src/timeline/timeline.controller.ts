import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimelineService } from './timeline.service';
import {
  CreateEventDto,
  UpdateEventDto,
  ReorderEventsDto,
  LinkCharacterDto,
  LinkSceneDto,
} from './dto/event.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  @Post('projects/:projectId/timeline/events')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateEventDto) {
    return this.timelineService.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/timeline/events')
  findAll(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query('order') order?: 'chronological' | 'narrative',
  ) {
    return order === 'narrative'
      ? this.timelineService.findAllNarrative(req.user.userId, projectId)
      : this.timelineService.findAllChronological(req.user.userId, projectId);
  }

  @Get('projects/:projectId/timeline/inconsistencies')
  findInconsistencies(@Req() req: any, @Param('projectId') projectId: string) {
    return this.timelineService.findInconsistencies(req.user.userId, projectId);
  }

  @Post('projects/:projectId/timeline/events/reorder')
  reorder(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: ReorderEventsDto) {
    return this.timelineService.reorder(req.user.userId, projectId, dto);
  }

  @Get('timeline/events/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.timelineService.findOne(req.user.userId, id);
  }

  @Patch('timeline/events/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.timelineService.update(req.user.userId, id, dto);
  }

  @Delete('timeline/events/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.timelineService.remove(req.user.userId, id);
  }

  @Post('timeline/events/:id/characters')
  linkCharacter(@Req() req: any, @Param('id') id: string, @Body() dto: LinkCharacterDto) {
    return this.timelineService.linkCharacter(req.user.userId, id, dto);
  }

  @Delete('timeline/events/:id/characters/:characterId')
  unlinkCharacter(
    @Req() req: any,
    @Param('id') id: string,
    @Param('characterId') characterId: string,
  ) {
    return this.timelineService.unlinkCharacter(req.user.userId, id, characterId);
  }

  @Post('timeline/events/:id/scenes')
  linkScene(@Req() req: any, @Param('id') id: string, @Body() dto: LinkSceneDto) {
    return this.timelineService.linkScene(req.user.userId, id, dto);
  }

  @Delete('timeline/events/:id/scenes/:sceneId')
  unlinkScene(@Req() req: any, @Param('id') id: string, @Param('sceneId') sceneId: string) {
    return this.timelineService.unlinkScene(req.user.userId, id, sceneId);
  }
}
