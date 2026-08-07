import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// Requiere el paquete `passport-microsoft` (agregar a package.json antes de habilitar este módulo)
import { Strategy } from 'passport-microsoft';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor() {
    super({
      clientID: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
      callbackURL: process.env.MICROSOFT_CALLBACK_URL,
      scope: ['user.read'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (err: any, user: any) => void,
  ) {
    done(null, {
      email: profile.emails?.[0]?.value ?? profile._json?.mail,
      name: profile.displayName,
      avatarUrl: undefined,
      providerId: profile.id,
    });
  }
}
