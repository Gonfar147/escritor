import { Module } from '@nestjs/common';
import { CharactersModule } from '../characters/characters.module';
import { LocationsModule } from '../locations/locations.module';
import { ObjectsModule } from '../objects/objects.module';
import { WorldBuildingModule } from '../world-building/world-building.module';

@Module({
  imports: [CharactersModule, LocationsModule, ObjectsModule, WorldBuildingModule],
})
export class CodexModule {}
