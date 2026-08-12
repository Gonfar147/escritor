import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ArchitectureModule } from '../architecture/architecture.module';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { NoteGroupsService } from './note-groups.service';
import { NotesAiService } from './notes-ai.service';

@Module({
  // AiModule: reusa AnthropicService + RagService (embeddings/búsqueda semántica ya
  // existen para el resto del codex). ArchitectureModule: reusa ArchitectureContextService
  // para el "contexto mínimo de la novela" que pide el punto 25, en vez de reinventar
  // un armador de contexto paralelo.
  imports: [AiModule, ArchitectureModule],
  controllers: [NotesController],
  providers: [NotesService, NoteGroupsService, NotesAiService],
  exports: [NotesService],
})
export class NotesModule {}
