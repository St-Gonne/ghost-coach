import type { CookieOptions, Response } from "express";
import { config } from "../config";

export const SESSION_COOKIE_NAME = "ghost_coach_session";
export const CSRF_COOKIE_NAME = "ghost_coach_csrf";
export const OAUTH_STATE_COOKIE_NAME = "ghost_coach_oauth_state";
export const OAUTH_CODE_VERIFIER_COOKIE_NAME = "ghost_coach_pkce_verifier";

function cookieBaseOptions(maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.nodeEnv === "production",
    path: "/",
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

export function setSessionCookies(
  res: Response,
  sessionToken: string,
  csrfToken: string,
  expiresAt: Date,
): void {
  const maxAgeMs = Math.max(expiresAt.getTime() - Date.now(), 0);
  res.cookie(SESSION_COOKIE_NAME, sessionToken, cookieBaseOptions(maxAgeMs));
  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...cookieBaseOptions(maxAgeMs),
    httpOnly: false,
  });
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, cookieBaseOptions());
  res.clearCookie(CSRF_COOKIE_NAME, {
    ...cookieBaseOptions(),
    httpOnly: false,
  });
}

export function setOauthCookies(
  res: Response,
  state: string,
  codeVerifier: string,
): void {
  const maxAgeMs = 10 * 60 * 1000;
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, cookieBaseOptions(maxAgeMs));
  res.cookie(
    OAUTH_CODE_VERIFIER_COOKIE_NAME,
    codeVerifier,
    cookieBaseOptions(maxAgeMs),
  );
}

export function clearOauthCookies(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, cookieBaseOptions());
  res.clearCookie(OAUTH_CODE_VERIFIER_COOKIE_NAME, cookieBaseOptions());
}
