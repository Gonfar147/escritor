import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const REFRESH_COOKIE = 'refresh_token';
const isProd = process.env.NODE_ENV === 'production';
const REMEMBER_ME_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días, en línea con el expiresIn del refresh token

const BASE_REFRESH_COOKIE_OPTS: {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'none' | 'lax';
  path: string;
} = {
  httpOnly: true,
  secure: isProd,
  // En producción, front y back viven en dominios distintos (ej. Render),
  // así que la cookie tiene que ser cross-site: 'none' + secure. En local
  // ambos son http://localhost y 'lax' alcanza (y evita requerir HTTPS).
  sameSite: isProd ? 'none' : 'lax',
  path: '/api/v1/auth',
};

/**
 * Si rememberMe es true, la cookie queda persistente (sobrevive a cerrar el
 * navegador) con maxAge alineado al expiresIn del refresh token. Si es false,
 * es una cookie de sesión pura (sin maxAge/expires): el navegador la borra
 * al cerrarse por completo, y de todos modos el refresh token subyacente
 * expira a las 24hs como tope de seguridad.
 */
function refreshCookieOpts(rememberMe: boolean) {
  return rememberMe
    ? { ...BASE_REFRESH_COOKIE_OPTS, maxAge: REMEMBER_ME_MAX_AGE_MS }
    : BASE_REFRESH_COOKIE_OPTS;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOpts(tokens.rememberMe));
    return { accessToken: tokens.accessToken };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOpts(tokens.rememberMe));
    return { accessToken: tokens.accessToken };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    // El userId debería venir de un JWT de refresh ya decodificado por un guard dedicado;
    // simplificado acá para el MVP.
    const payload = JSON.parse(
      Buffer.from(refreshToken.split('.')[1], 'base64').toString(),
    );
    const rememberMe = Boolean(payload.remember);
    const tokens = await this.authService.refresh(payload.sub, refreshToken, rememberMe);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOpts(tokens.rememberMe));
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.userId);
    res.clearCookie(REFRESH_COOKIE, BASE_REFRESH_COOKIE_OPTS);
    return { success: true };
  }

  // ---- OAuth: Google ----
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Passport redirige a Google automáticamente
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.handleOAuthCallback(req, res, 'GOOGLE');
  }

  // ---- OAuth: GitHub ----
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {}

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.handleOAuthCallback(req, res, 'GITHUB');
  }

  // ---- OAuth: Microsoft ----
  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftAuth() {}

  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftCallback(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.handleOAuthCallback(req, res, 'MICROSOFT');
  }

  private async handleOAuthCallback(
    req: any,
    res: Response,
    provider: 'GOOGLE' | 'GITHUB' | 'MICROSOFT',
  ) {
    const tokens = await this.authService.findOrCreateOAuthUser({
      email: req.user.email,
      name: req.user.name,
      avatarUrl: req.user.avatarUrl,
      provider: provider as any,
      providerId: req.user.providerId,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOpts(tokens.rememberMe));
    // Redirige al frontend con el access token en el fragmento de la URL
    res.redirect(`${process.env.WEB_URL}/auth/callback#token=${tokens.accessToken}`);
  }
}
