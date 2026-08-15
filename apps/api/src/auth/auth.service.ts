import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthProvider } from '@prisma/client';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        provider: AuthProvider.EMAIL,
      },
    });

    return this.issueTokens(user.id, user.email, dto.rememberMe ?? false);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueTokens(user.id, user.email, dto.rememberMe ?? false);
  }

  async refresh(userId: string, providedRefreshToken: string, rememberMe: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshToken) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const matches = await argon2.verify(user.refreshToken, providedRefreshToken);
    if (!matches) {
      throw new UnauthorizedException('Sesión inválida');
    }

    return this.issueTokens(user.id, user.email, rememberMe);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  /** Usado por las estrategias OAuth para crear o recuperar el usuario */
  async findOrCreateOAuthUser(params: {
    email: string;
    name: string;
    avatarUrl?: string;
    provider: AuthProvider;
    providerId: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { email: params.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: params.email,
          name: params.name,
          avatarUrl: params.avatarUrl,
          provider: params.provider,
          providerId: params.providerId,
        },
      });
    }

    // Sin checkbox de "mantener sesión" en el flujo OAuth, se asume rememberMe
    // para no degradar la experiencia (el usuario no tiene forma de tildarlo).
    return this.issueTokens(user.id, user.email, true);
  }

  private async issueTokens(
    userId: string,
    email: string,
    rememberMe: boolean,
  ): Promise<TokenPair> {
    const accessToken = this.jwt.sign(
      { sub: userId, email },
      { expiresIn: '15m' },
    );
    const refreshToken = this.jwt.sign(
      // `remember` viaja en el propio refresh token para que, al renovarlo,
      // sepamos si hay que volver a emitir una cookie persistente o de sesión.
      { sub: userId, type: 'refresh', remember: rememberMe },
      { expiresIn: rememberMe ? '30d' : '1d' },
    );

    const refreshTokenHash = await argon2.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: refreshTokenHash },
    });

    return { accessToken, refreshToken, rememberMe };
  }
}
