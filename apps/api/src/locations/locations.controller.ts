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
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto, LinkSceneDto } from './dto/location.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post('projects/:projectId/locations')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateLocationDto) {
    return this.locationsService.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/locations')
  findAll(@Req() req: any, @Param('projectId') projectId: string) {
    return this.locationsService.findAll(req.user.userId, projectId);
  }

  @Get('locations/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.locationsService.findOne(req.user.userId, id);
  }

  @Patch('locations/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(req.user.userId, id, dto);
  }

  @Delete('locations/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.locationsService.remove(req.user.userId, id);
  }

  @Post('locations/:id/scenes')
  linkScene(@Req() req: any, @Param('id') id: string, @Body() dto: LinkSceneDto) {
    return this.locationsService.linkScene(req.user.userId, id, dto);
  }

  @Delete('locations/:id/scenes/:sceneId')
  unlinkScene(@Req() req: any, @Param('id') id: string, @Param('sceneId') sceneId: string) {
    return this.locationsService.unlinkScene(req.user.userId, id, sceneId);
  }
}
