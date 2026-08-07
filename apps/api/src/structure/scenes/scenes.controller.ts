import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ScenesService } from './scenes.service';
import {
  CreateSceneDto,
  UpdateSceneDto,
  ReorderScenesDto,
  MoveSceneDto,
  MergeScenesDto,
  SplitSceneDto,
} from './dto/scene.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Post('chapters/:chapterId/scenes')
  create(@Req() req: any, @Param('chapterId') chapterId: string, @Body() dto: CreateSceneDto) {
    return this.scenesService.create(req.user.userId, chapterId, dto);
  }

  @Get('chapters/:chapterId/scenes')
  findAll(@Req() req: any, @Param('chapterId') chapterId: string) {
    return this.scenesService.findAll(req.user.userId, chapterId);
  }

  @Get('scenes/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.scenesService.findOne(req.user.userId, id);
  }

  @Patch('scenes/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSceneDto) {
    return this.scenesService.update(req.user.userId, id, dto);
  }

  @Delete('scenes/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.scenesService.remove(req.user.userId, id);
  }

  @Post('chapters/:chapterId/scenes/reorder')
  reorder(@Req() req: any, @Param('chapterId') chapterId: string, @Body() dto: ReorderScenesDto) {
    return this.scenesService.reorder(req.user.userId, chapterId, dto);
  }

  @Post('scenes/:id/move')
  move(@Req() req: any, @Param('id') id: string, @Body() dto: MoveSceneDto) {
    return this.scenesService.move(req.user.userId, id, dto);
  }

  @Post('scenes/:id/duplicate')
  duplicate(@Req() req: any, @Param('id') id: string) {
    return this.scenesService.duplicate(req.user.userId, id);
  }

  @Post('scenes/merge')
  merge(@Req() req: any, @Body() dto: MergeScenesDto) {
    return this.scenesService.merge(req.user.userId, dto);
  }

  @Post('scenes/:id/split')
  split(@Req() req: any, @Param('id') id: string, @Body() dto: SplitSceneDto) {
    return this.scenesService.split(req.user.userId, id, dto);
  }

  @Post('scenes/:id/versions')
  createVersion(@Req() req: any, @Param('id') id: string) {
    return this.scenesService.createVersion(req.user.userId, id);
  }

  @Get('scenes/:id/versions')
  listVersions(@Req() req: any, @Param('id') id: string) {
    return this.scenesService.listVersions(req.user.userId, id);
  }

  @Post('scenes/:id/versions/:versionId/restore')
  restoreVersion(
    @Req() req: any,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.scenesService.restoreVersion(req.user.userId, id, versionId);
  }
}
