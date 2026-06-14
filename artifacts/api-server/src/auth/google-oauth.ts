import { createHash, randomBytes } from "node:crypto";
import { config } from "../config";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

function base64UrlSha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function buildGoogleOauthStart(): {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
} {
  if (
    !config.google.clientId ||
    !config.google.clientSecret ||
    !config.google.redirectUri
  ) {
    throw new Error("Google OAuth environment variables are not configured");
  }

  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = base64UrlSha256(codeVerifier);

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", config.google.clientId);
  url.searchParams.set("redirect_uri", config.google.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return {
    authorizationUrl: url.toString(),
    state,
    codeVerifier,
  };
}

export async function exchangeGoogleCode(params: {
  code: string;
  codeVerifier: string;
}) {
  const body = new URLSearchParams({
    code: params.code,
    client_id: config.google.clientId,
    client_secret: config.google.clientSecret,
    redirect_uri: config.google.redirectUri,
    grant_type: "authorization_code",
    code_verifier: params.codeVerifier,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description ?? json.error ?? "Failed to exchange Google authorization code",
    );
  }

  return json;
}

export async function getGoogleUserProfile(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  const json = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    locale?: string;
  };

  if (!response.ok || !json.email || !json.sub) {
    throw new Error("Failed to fetch Google user profile");
  }

  return json;
}

export function getPostLoginRedirectUrl(): string {
  const redirect = new URL(config.google.redirectUri);
  const suffix = "/api/auth/google/callback";
  const pathname = redirect.pathname.endsWith(suffix)
    ? redirect.pathname.slice(0, -suffix.length) || "/"
    : "/";
  const url = new URL(pathname, redirect.origin);
  const basePath = url.pathname.replace(/\/+$/, "");
  url.pathname = `${basePath}/integrations`.replace(/\/{2,}/g, "/");
  url.searchParams.set("connected", "google");
  return url.toString();
}
