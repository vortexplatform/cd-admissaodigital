import { Body, Controller, Get, Post, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AUTH_COOKIE_NAME, authCookieOptions, clearAuthCookieOptions } from './auth-cookie';

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
    const { accessToken, ...session } = await this.auth.verifyOtp(dto.identifier, dto.code);
    response.cookie(AUTH_COOKIE_NAME, accessToken, authCookieOptions());
    return session;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions());
    return { message: 'Sessão encerrada com sucesso.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: number } }) {
    return this.auth.getSession(req.user.id);
  }
}
