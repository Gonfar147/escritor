import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
// Habilitar cuando se instale `passport-microsoft`:
// import { MicrosoftStrategy } from './strategies/microsoft.strategy';

// passport-oauth2 (base de las estrategias de Google/GitHub) lanza una excepción
// en su propio constructor si falta clientID/clientSecret — como Nest instancia
// todos los providers al arrancar, eso tumbaba el servidor entero en cualquier
// entorno que no tuviera OAuth configurado (típicamente, desarrollo local).
// Por eso cada estrategia solo se registra si sus credenciales están presentes;
// las rutas /auth/google y /auth/github devuelven 404 hasta que las configures.
const oauthProviders = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [GoogleStrategy] : []),
  ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? [GithubStrategy] : []),
];

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ...oauthProviders],
  exports: [AuthService],
})
export class AuthModule {}
