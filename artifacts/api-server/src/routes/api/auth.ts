import { Router } from "express";
import { db } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { calendarConnectionsTable } from "@workspace/db/schema";
import { config } from "../../config";
import {
  buildGoogleOauthStart,
  exchangeGoogleCode,
  getGoogleUserProfile,
  getPostLoginRedirectUrl,
} from "../../auth/google-oauth";
import {
  clearOauthCookies,
  clearSessionCookies,
  OAUTH_CODE_VERIFIER_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  setOauthCookies,
  setSessionCookies,
} from "../../auth/cookies";
import { clearAuthenticatedSession } from "../../auth/session-middleware";
import { createSession } from "../../auth/session-service";
import { ensureGhostCoachUser } from "../../auth/user";
import { encryptToken } from "../../auth/token-crypto";

const router = Router();

router.get("/auth/status", async (req, res) => {
  try {
    if (config.mockIntegrations) {
      return res.json({
        authenticated: true,
        mockMode: true,
        allowedEmailConfigured: Boolean(config.allowedEmail),
        user: req.ghostCoachUser ?? null,
      });
    }

    return res.json({
      authenticated: Boolean(req.ghostCoachUser),
      mockMode: false,
      allowedEmailConfigured: Boolean(config.allowedEmail),
      user: req.ghostCoachUser ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "GET /auth/status error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", async (req, res) => {
  try {
    await clearAuthenticatedSession(req, res);
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "POST /auth/logout error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/google/start", async (req, res) => {
  try {
    const { authorizationUrl, state, codeVerifier } = buildGoogleOauthStart();
    setOauthCookies(res, state, codeVerifier);
    return res.redirect(302, authorizationUrl);
  } catch (err) {
    req.log.error({ err }, "GET /auth/google/start error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/google/callback", async (req, res) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const stateCookie = req.cookies?.[OAUTH_STATE_COOKIE_NAME];
    const codeVerifier = req.cookies?.[OAUTH_CODE_VERIFIER_COOKIE_NAME];

    if (!code || !state || !stateCookie || !codeVerifier || state !== stateCookie) {
      clearOauthCookies(res);
      clearSessionCookies(res);
      return res.status(400).json({ error: "Invalid OAuth callback state" });
    }

    const tokenResponse = await exchangeGoogleCode({ code, codeVerifier });
    const accessToken = tokenResponse.access_token;
    if (!accessToken) {
      throw new Error("Google access token missing from callback exchange");
    }
    const profile = await getGoogleUserProfile(accessToken);

    if (!config.allowedEmail || profile.email !== config.allowedEmail) {
      clearOauthCookies(res);
      clearSessionCookies(res);
      return res.status(403).json({ error: "Unauthorized account" });
    }

    const user = await ensureGhostCoachUser({
      email: profile.email,
      displayName: profile.name ?? profile.email,
    });

    const existingConnection = await db
      .select()
      .from(calendarConnectionsTable)
      .where(
        and(
          eq(calendarConnectionsTable.userId, user.id),
          eq(calendarConnectionsTable.provider, "google"),
        ),
      )
      .limit(1);

    const connectionValues = {
      encryptedAccessToken: encryptToken(accessToken),
      encryptedRefreshToken: tokenResponse.refresh_token
        ? encryptToken(tokenResponse.refresh_token)
        : existingConnection[0]?.encryptedRefreshToken ?? null,
      tokenExpiry: new Date(
        Date.now() + (tokenResponse.expires_in ?? 3600) * 1000,
      ),
      grantedScopes: tokenResponse.scope ?? null,
      providerAccountEmail: profile.email,
      providerAccountSub: profile.sub,
      status: "active",
      lastSuccessAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    };

    if (existingConnection[0]) {
      await db
        .update(calendarConnectionsTable)
        .set(connectionValues)
        .where(eq(calendarConnectionsTable.id, existingConnection[0].id));
    } else {
      await db.insert(calendarConnectionsTable).values({
        userId: user.id,
        provider: "google",
        selectedReadCalendarIds: [],
        ...connectionValues,
      });
    }

    const session = await createSession(user.id);
    setSessionCookies(
      res,
      session.sessionToken,
      session.csrfToken,
      session.expiresAt,
    );
    clearOauthCookies(res);

    return res.redirect(302, getPostLoginRedirectUrl());
  } catch (err) {
    req.log.error({ err }, "GET /auth/google/callback error");
    clearOauthCookies(res);
    clearSessionCookies(res);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
