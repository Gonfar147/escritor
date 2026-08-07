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
import { ChaptersService } from './chapters.service';
import {
  CreateChapterDto,
  UpdateChapterDto,
  ReorderChaptersDto,
  MoveChapterDto,
  MergeChaptersDto,
} from './dto/chapter.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Post('parts/:partId/chapters')
  create(@Req() req: any, @Param('partId') partId: string, @Body() dto: CreateChapterDto) {
    return this.chaptersService.create(req.user.userId, partId, dto);
  }

  @Get('parts/:partId/chapters')
  findAll(@Req() req: any, @Param('partId') partId: string) {
    return this.chaptersService.findAll(req.user.userId, partId);
  }

  @Patch('chapters/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateChapterDto) {
    return this.chaptersService.update(req.user.userId, id, dto);
  }

  @Delete('chapters/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.chaptersService.remove(req.user.userId, id);
  }

  @Post('parts/:partId/chapters/reorder')
  reorder(@Req() req: any, @Param('partId') partId: string, @Body() dto: ReorderChaptersDto) {
    return this.chaptersService.reorder(req.user.userId, partId, dto);
  }

  @Post('chapters/:id/move')
  move(@Req() req: any, @Param('id') id: string, @Body() dto: MoveChapterDto) {
    return this.chaptersService.move(req.user.userId, id, dto);
  }

  @Post('chapters/:id/duplicate')
  duplicate(@Req() req: any, @Param('id') id: string) {
    return this.chaptersService.duplicate(req.user.userId, id);
  }

  @Post('chapters/merge')
  merge(@Req() req: any, @Body() dto: MergeChaptersDto) {
    return this.chaptersService.merge(req.user.userId, dto);
  }
}
