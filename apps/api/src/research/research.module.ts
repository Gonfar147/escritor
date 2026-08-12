import { Module } from '@nestjs/common';
import { ResearchService } from './research.service';
import { ResearchController } from './research.controller';
import { OcrModule } from '../ocr/ocr.module';
import { TranscriptionModule } from '../transcription/transcription.module';

@Module({
  imports: [OcrModule, TranscriptionModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
