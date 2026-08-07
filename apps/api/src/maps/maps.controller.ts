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
import { MapsService } from './maps.service';
import { MapType } from '@prisma/client';
import {
  CreateMapDto,
  UpdateMapDto,
  CreatePinDto,
  UpdatePinDto,
  CreateMovementDto,
} from './dto/map.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Post('projects/:projectId/maps')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateMapDto) {
    return this.mapsService.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/maps')
  findAll(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query('mapType') mapType?: MapType,
  ) {
    return this.mapsService.findAll(req.user.userId, projectId, mapType);
  }

  @Get('projects/:projectId/maps/tree')
  findTree(@Req() req: any, @Param('projectId') projectId: string) {
    return this.mapsService.findTree(req.user.userId, projectId);
  }

  @Get('maps/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.mapsService.findOne(req.user.userId, id);
  }

  @Patch('maps/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMapDto) {
    return this.mapsService.update(req.user.userId, id, dto);
  }

  @Delete('maps/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.mapsService.remove(req.user.userId, id);
  }

  @Post('maps/:id/pins')
  addPin(@Req() req: any, @Param('id') id: string, @Body() dto: CreatePinDto) {
    return this.mapsService.addPin(req.user.userId, id, dto);
  }

  @Patch('pins/:id')
  updatePin(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePinDto) {
    return this.mapsService.updatePin(req.user.userId, id, dto);
  }

  @Delete('pins/:id')
  removePin(@Req() req: any, @Param('id') id: string) {
    return this.mapsService.removePin(req.user.userId, id);
  }

  @Post('maps/:id/movements')
  addMovement(@Req() req: any, @Param('id') id: string, @Body() dto: CreateMovementDto) {
    return this.mapsService.addMovement(req.user.userId, id, dto);
  }

  @Delete('movements/:id')
  removeMovement(@Req() req: any, @Param('id') id: string) {
    return this.mapsService.removeMovement(req.user.userId, id);
  }

  @Get('maps/:id/characters/:characterId/path')
  characterPath(
    @Req() req: any,
    @Param('id') id: string,
    @Param('characterId') characterId: string,
  ) {
    return this.mapsService.characterPath(req.user.userId, characterId, id);
  }
}
