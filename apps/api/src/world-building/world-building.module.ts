import { Module } from '@nestjs/common';
import { WorldBuildingService } from './world-building.service';
import { WorldBuildingController } from './world-building.controller';

@Module({
  controllers: [WorldBuildingController],
  providers: [WorldBuildingService],
  exports: [WorldBuildingService],
})
export class WorldBuildingModule {}
