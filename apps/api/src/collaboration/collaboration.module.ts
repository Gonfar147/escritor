import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CollaborationService } from './collaboration.service';

@Module({
  imports: [
    // Registro propio y liviano (no exportado por AuthModule): mismo JWT_SECRET
    // que usa el login/refresh, pero sin acoplar este módulo a AuthModule.
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
