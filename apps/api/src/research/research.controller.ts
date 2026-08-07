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
import { ResearchService } from './research.service';
import { ResearchItemType } from '@prisma/client';
import { CreateResearchItemDto, UpdateResearchItemDto } from './dto/research-item.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Post('projects/:projectId/research')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreateResearchItemDto) {
    return this.researchService.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/research')
  findAll(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Query('type') type?: ResearchItemType,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
  ) {
    return this.researchService.findAll(req.user.userId, projectId, { type, tag, search });
  }

  @Get('projects/:projectId/research/tags')
  listTags(@Req() req: any, @Param('projectId') projectId: string) {
    return this.researchService.listTags(req.user.userId, projectId);
  }

  @Get('research/:id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.researchService.findOne(req.user.userId, id);
  }

  @Patch('research/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateResearchItemDto) {
    return this.researchService.update(req.user.userId, id, dto);
  }

  @Delete('research/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.researchService.remove(req.user.userId, id);
  }
}
