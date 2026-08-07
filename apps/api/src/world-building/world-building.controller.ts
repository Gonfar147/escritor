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
import { WorldBuildingService } from './world-building.service';
import { WorldCategory } from '@prisma/client';
import {
  CreateWorldEntryDto,
  UpdateWorldEntryDto,
  CreateWorldEntryLinkDto,
} from './dto/world-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class WorldBuildingController {
  constructor(private readonly worldBuildingService: WorldBuildingService) {}

  @Post('projects/:projectId/world-entries')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateWorldEntryDto) {
    return this.worldBuildingService.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/world-entries')
  findAll(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query('category') category?: WorldCategory,
  ) {
    return this.worldBuildingService.findAll(req.user.userId, projectId, category);
  }

  @Get('projects/:projectId/world-entries/tree')
  findTree(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query('category') category?: WorldCategory,
  ) {
    return this.worldBuildingService.findTree(req.user.userId, projectId, category);
  }

  @Get('world-entries/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.worldBuildingService.findOne(req.user.userId, id);
  }

  @Patch('world-entries/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateWorldEntryDto) {
    return this.worldBuildingService.update(req.user.userId, id, dto);
  }

  @Delete('world-entries/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.worldBuildingService.remove(req.user.userId, id);
  }

  @Post('world-entries/:id/links')
  addLink(@Req() req: any, @Param('id') id: string, @Body() dto: CreateWorldEntryLinkDto) {
    return this.worldBuildingService.addLink(req.user.userId, id, dto);
  }

  @Delete('world-entries/:id/links/:linkId')
  removeLink(@Req() req: any, @Param('id') id: string, @Param('linkId') linkId: string) {
    return this.worldBuildingService.removeLink(req.user.userId, id, linkId);
  }
}
