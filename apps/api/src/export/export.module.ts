import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ManuscriptAssembler } from './manuscript-assembler.service';
import { DocxExporter } from './docx-exporter';
import { PdfExporter } from './pdf-exporter';
import { EpubExporter } from './epub-exporter';

@Module({
  controllers: [ExportController],
  providers: [ManuscriptAssembler, DocxExporter, PdfExporter, EpubExporter],
})
export class ExportModule {}
