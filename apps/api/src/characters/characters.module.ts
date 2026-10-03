import { Module } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CharactersController } from './characters.controller';
import { CharacterSheetExporter } from './character-sheet.exporter';

@Module({
  controllers: [CharactersController],
  providers: [CharactersService, CharacterSheetExporter],
  exports: [CharactersService],
})
export class CharactersModule {}
