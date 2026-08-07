import { Module } from '@nestjs/common';
import { PartsModule } from './parts/parts.module';
import { ChaptersModule } from './chapters/chapters.module';
import { ScenesModule } from './scenes/scenes.module';

@Module({
  imports: [PartsModule, ChaptersModule, ScenesModule],
})
export class StructureModule {}
