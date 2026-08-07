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
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  // En producción, front y back viven en dominios distintos (ej. Render),
  // así que la cookie tiene que ser cross-site: 'none' + secure. En local
  // ambos son http://localhost y 'lax' alcanza (y evita requerir HTTPS).
  sameSite: (isProd ? 'none' : 'lax') as const,
  path: '/api/v1/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTS);
    return { accessToken: tokens.accessToken };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTS);
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
    const tokens = await this.authService.refresh(payload.sub, refreshToken);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTS);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.userId);
    res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTS);
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
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTS);
    // Redirige al frontend con el access token en el fragmento de la URL
    res.redirect(`${process.env.WEB_URL}/auth/callback#token=${tokens.accessToken}`);
  }
}
