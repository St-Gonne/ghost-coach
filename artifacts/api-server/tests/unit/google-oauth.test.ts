import { beforeEach, describe, expect, it, vi } from "vitest";

describe("google-oauth helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_REDIRECT_URI =
      "http://127.0.0.1:3000/api/auth/google/callback";
  });

  it("builds a consent URL with PKCE and calendar scopes", async () => {
    const { buildGoogleOauthStart } = await import(
      "../../src/auth/google-oauth"
    );

    const result = buildGoogleOauthStart();
    const url = new URL(result.authorizationUrl);

    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/calendar.readonly",
    );
    expect(result.state).toBeTruthy();
    expect(result.codeVerifier).toBeTruthy();
  });

  it("derives the post-login integrations URL from the callback URL", async () => {
    const { getPostLoginRedirectUrl } = await import(
      "../../src/auth/google-oauth"
    );

    expect(getPostLoginRedirectUrl()).toBe(
      "http://127.0.0.1:3000/integrations?connected=google",
    );
  });
});
