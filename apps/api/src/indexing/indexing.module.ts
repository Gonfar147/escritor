import { Global, Module } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { IndexingService } from './indexing.service';

/**
 * Global: se importa una única vez en AppModule y sus providers (EmbeddingsService,
 * IndexingService) quedan disponibles para inyectar en cualquier módulo sin volver
 * a importarlo — así los servicios de contenido (Scenes, Characters, etc.) pueden
 * llamar a IndexingService sin crear una dependencia circular de módulos.
 */
@Global()
@Module({
  providers: [EmbeddingsService, IndexingService],
  exports: [EmbeddingsService, IndexingService],
})
export class IndexingModule {}
