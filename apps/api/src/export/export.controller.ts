import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ManuscriptAssembler, DEFAULT_EXPORT_OPTIONS } from './manuscript-assembler.service';
import { DocxExporter } from './docx-exporter';
import { PdfExporter } from './pdf-exporter';
import { EpubExporter } from './epub-exporter';

function slugify(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'manuscrito'
  );
}

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/export')
export class ExportController {
  constructor(
    private readonly assembler: ManuscriptAssembler,
    private readonly docx: DocxExporter,
    private readonly pdf: PdfExporter,
    private readonly epub: EpubExporter,
  ) {}

  @Get('docx')
  async exportDocx(@Req() req: any, @Param('projectId') projectId: string, @Query() query: any, @Res() res: Response) {
    const manuscript = await this.assembler.assemble(req.user.userId, projectId);
    const buffer = await this.docx.export(manuscript, this.parseOptions(query));
    this.send(res, buffer, `${slugify(manuscript.title)}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }

  @Get('pdf')
  async exportPdf(@Req() req: any, @Param('projectId') projectId: string, @Query() query: any, @Res() res: Response) {
    const manuscript = await this.assembler.assemble(req.user.userId, projectId);
    const buffer = await this.pdf.export(manuscript, this.parseOptions(query));
    this.send(res, buffer, `${slugify(manuscript.title)}.pdf`, 'application/pdf');
  }

  @Get('epub')
  async exportEpub(@Req() req: any, @Param('projectId') projectId: string, @Query() query: any, @Res() res: Response) {
    const manuscript = await this.assembler.assemble(req.user.userId, projectId);
    const buffer = await this.epub.export(manuscript, this.parseOptions(query));
    this.send(res, buffer, `${slugify(manuscript.title)}.epub`, 'application/epub+zip');
  }

  private parseOptions(query: any) {
    return {
      includeSceneTitles: query.includeSceneTitles === 'true' ? true : DEFAULT_EXPORT_OPTIONS.includeSceneTitles,
      includePartTitles: query.includePartTitles === 'false' ? false : DEFAULT_EXPORT_OPTIONS.includePartTitles,
    };
  }

  private send(res: Response, buffer: Buffer, filename: string, contentType: string) {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  }
}
