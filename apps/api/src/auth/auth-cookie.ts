import type { CookieOptions, Request } from 'express';

export const AUTH_COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});

export const authCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  maxAge: 15 * 60 * 1000,
});

export const refreshCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

export const clearAuthCookieOptions = (): CookieOptions => baseCookieOptions();

export const extractCookieValue = (request: Request, name: string): string | null => {
  const cookies = request.headers.cookie;
  if (!cookies) return null;

  const tokenCookie = cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  if (!tokenCookie) return null;

  return decodeURIComponent(tokenCookie.split('=').slice(1).join('='));
};

export const extractAuthTokenFromCookie = (request: Request): string | null =>
  extractCookieValue(request, AUTH_COOKIE_NAME);
