import { Body, Controller, Get, Post, Req, Request, Res, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { IntegrationTokenDto } from './dto/integration-token.dto';
import { LoginPasswordDto } from './dto/login-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  authCookieOptions,
  clearAuthCookieOptions,
  extractCookieValue,
  refreshCookieOptions,
} from './auth-cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('send-otp')
  async sendOtp(@Body() dto: SendOtpDto) {
    await this.auth.sendOtp(dto.identifier);
    return { message: 'Código enviado com sucesso.' };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) response: Response) {
    const { accessToken, refreshToken, ...session } = await this.auth.verifyOtp(
      dto.identifier,
      dto.cpf,
      dto.code,
    );
    this.setSessionCookies(response, accessToken, refreshToken);
    return session;
  }

  @Post('login')
  async login(@Body() dto: LoginPasswordDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.loginWithPassword(dto.cpf, dto.password);

    if (result.requiresPasswordSetup) {
      response.cookie(AUTH_COOKIE_NAME, result.accessToken, authCookieOptions());
      return { requiresPasswordSetup: true };
    }

    const { accessToken, refreshToken, ...session } = result;
    this.setSessionCookies(response, accessToken, refreshToken);
    return session;
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-password')
  async setPassword(
    @Body() dto: SetPasswordDto,
    @Request() req: { user: { id: number } },
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken, ...session } = await this.auth.setPassword(req.user.id, dto.password);
    this.setSessionCookies(response, accessToken, refreshToken);
    return session;
  }

  @Post('refresh')
  async refresh(@Req() request: ExpressRequest, @Res({ passthrough: true }) response: Response) {
    const refreshToken = extractCookieValue(request, REFRESH_COOKIE_NAME);
    const { accessToken, refreshToken: nextRefreshToken, ...session } = await this.auth.refreshSession(
      refreshToken ?? '',
    );

    this.setSessionCookies(response, accessToken, nextRefreshToken);
    return session;
  }

  @Post('integrations/token')
  createIntegrationToken(@Body() dto: IntegrationTokenDto) {
    return this.auth.createIntegrationToken(dto.clientId, dto.clientSecret);
  }

  @Post('logout')
  async logout(@Req() request: ExpressRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.revokeRefreshToken(extractCookieValue(request, REFRESH_COOKIE_NAME));
    this.clearSessionCookies(response);
    return { message: 'Sessão encerrada com sucesso.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: number } }) {
    return this.auth.getSession(req.user.id);
  }

  private setSessionCookies(response: Response, accessToken: string, refreshToken: string) {
    response.cookie(AUTH_COOKIE_NAME, accessToken, authCookieOptions());
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  }

  private clearSessionCookies(response: Response) {
    response.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions());
    response.clearCookie(REFRESH_COOKIE_NAME, clearAuthCookieOptions());
  }
}
