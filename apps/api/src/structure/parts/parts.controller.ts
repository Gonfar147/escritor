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
import { PartsService } from './parts.service';
import { CreatePartDto, UpdatePartDto, ReorderDto } from './dto/part.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Post('projects/:projectId/parts')
  create(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: CreatePartDto) {
    return this.partsService.create(req.user.userId, projectId, dto);
  }

  @Get('projects/:projectId/parts')
  findAll(@Req() req: any, @Param('projectId') projectId: string) {
    return this.partsService.findAll(req.user.userId, projectId);
  }

  @Patch('parts/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePartDto) {
    return this.partsService.update(req.user.userId, id, dto);
  }

  @Delete('parts/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.partsService.remove(req.user.userId, id);
  }

  @Post('projects/:projectId/parts/reorder')
  reorder(@Req() req: any, @Param('projectId') projectId: string, @Body() dto: ReorderDto) {
    return this.partsService.reorder(req.user.userId, projectId, dto);
  }
}
