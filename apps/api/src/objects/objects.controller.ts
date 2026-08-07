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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ObjectsService } from './objects.service';
import { CreateObjectDto, UpdateObjectDto, LinkSceneDto } from './dto/object.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ObjectsController {
  constructor(private readonly objectsService: ObjectsService) {}

  @Post('projects/:projectId/objects')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateObjectDto) {
    return this.objectsService.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/objects')
  findAll(@Req() req: any, @Param('projectId') projectId: string) {
    return this.objectsService.findAll(req.user.userId, projectId);
  }

  @Get('objects/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.objectsService.findOne(req.user.userId, id);
  }

  @Patch('objects/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateObjectDto) {
    return this.objectsService.update(req.user.userId, id, dto);
  }

  @Delete('objects/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.objectsService.remove(req.user.userId, id);
  }

  @Post('objects/:id/scenes')
  linkScene(@Req() req: any, @Param('id') id: string, @Body() dto: LinkSceneDto) {
    return this.objectsService.linkScene(req.user.userId, id, dto);
  }

  @Delete('objects/:id/scenes/:sceneId')
  unlinkScene(@Req() req: any, @Param('id') id: string, @Param('sceneId') sceneId: string) {
    return this.objectsService.unlinkScene(req.user.userId, id, sceneId);
  }
}
