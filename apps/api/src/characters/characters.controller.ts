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
import { CharactersService } from './characters.service';
import {
  CreateCharacterDto,
  UpdateCharacterDto,
  CreateCharacterRelationshipDto,
  LinkSceneDto,
} from './dto/character.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Post('projects/:projectId/characters')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateCharacterDto) {
    return this.charactersService.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/characters')
  findAll(@Req() req: any, @Param('projectId') projectId: string) {
    return this.charactersService.findAll(req.user.userId, projectId);
  }

  @Get('characters/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.charactersService.findOne(req.user.userId, id);
  }

  @Patch('characters/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCharacterDto) {
    return this.charactersService.update(req.user.userId, id, dto);
  }

  @Delete('characters/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.charactersService.remove(req.user.userId, id);
  }

  @Get('characters/:id/family-tree')
  familyTree(@Req() req: any, @Param('id') id: string, @Query('depth') depth?: string) {
    return this.charactersService.familyTree(req.user.userId, id, depth ? parseInt(depth, 10) : undefined);
  }

  @Post('characters/:id/relationships')
  addRelationship(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateCharacterRelationshipDto,
  ) {
    return this.charactersService.addRelationship(req.user.userId, id, dto);
  }

  @Delete('characters/:id/relationships/:relationshipId')
  removeRelationship(
    @Req() req: any,
    @Param('id') id: string,
    @Param('relationshipId') relationshipId: string,
  ) {
    return this.charactersService.removeRelationship(req.user.userId, id, relationshipId);
  }

  @Post('characters/:id/scenes')
  linkScene(@Req() req: any, @Param('id') id: string, @Body() dto: LinkSceneDto) {
    return this.charactersService.linkScene(req.user.userId, id, dto);
  }

  @Delete('characters/:id/scenes/:sceneId')
  unlinkScene(@Req() req: any, @Param('id') id: string, @Param('sceneId') sceneId: string) {
    return this.charactersService.unlinkScene(req.user.userId, id, sceneId);
  }
}
