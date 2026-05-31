import type { CookieOptions, Request } from 'express';

export const AUTH_COOKIE_NAME = 'auth_token';

export const authCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const clearAuthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
});

export const extractAuthTokenFromCookie = (request: Request): string | null => {
  const cookies = request.headers.cookie;
  if (!cookies) return null;

  const tokenCookie = cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!tokenCookie) return null;

  return decodeURIComponent(tokenCookie.split('=').slice(1).join('='));
};
