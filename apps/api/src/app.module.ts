import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { StructureModule } from './structure/structure.module';
import { CodexModule } from './codex/codex.module';
import { TimelineModule } from './timeline/timeline.module';
import { MapsModule } from './maps/maps.module';
import { UploadsModule } from './uploads/uploads.module';
import { ResearchModule } from './research/research.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    CommonModule,
    AuthModule,
    ProjectsModule,
    StructureModule,
    CodexModule,
    TimelineModule,
    MapsModule,
    UploadsModule,
    ResearchModule,
    // Fases siguientes se agregan acá como módulos independientes: AiModule, etc.
  ],
})
export class AppModule {}
