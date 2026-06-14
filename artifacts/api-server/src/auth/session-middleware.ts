import type { NextFunction, Request, Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { config } from "../config";
import {
  clearSessionCookies,
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "./cookies";
import { getSessionByToken, validateCsrfToken } from "./session-service";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isPublicRequest(method: string, path: string): boolean {
  const normalizedMethod = method.toUpperCase();
  return (
    path === "/healthz" ||
    (normalizedMethod === "GET" &&
      (path === "/auth/status" ||
        path === "/auth/google/start" ||
        path === "/auth/google/callback"))
  );
}

async function getMockUser() {
  const users = await db.select().from(usersTable).limit(1);
  return users[0] ?? null;
}

export async function authenticateApiRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (config.mockIntegrations) {
      req.ghostCoachUser = await getMockUser();
      return void next();
    }

    if (isPublicRequest(req.method, req.path)) {
      return void next();
    }

    const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (typeof sessionToken !== "string" || sessionToken.length === 0) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const session = await getSessionByToken(sessionToken);
    if (!session) {
      clearSessionCookies(res);
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!config.allowedEmail || session.user.email !== config.allowedEmail) {
      await clearAuthenticatedSession(req, res);
      res.status(403).json({ error: "Unauthorized account" });
      return;
    }

    if (!SAFE_METHODS.has(req.method.toUpperCase())) {
      const csrfToken = req.get("x-csrf-token");
      const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];

      if (
        typeof csrfToken !== "string" ||
        typeof csrfCookie !== "string" ||
        csrfToken.length === 0 ||
        csrfToken !== csrfCookie
      ) {
        res.status(403).json({ error: "Invalid CSRF token" });
        return;
      }

      const validCsrf = await validateCsrfToken(sessionToken, csrfToken);
      if (!validCsrf) {
        res.status(403).json({ error: "Invalid CSRF token" });
        return;
      }
    }

    req.ghostCoachUser = session.user;
    req.ghostCoachSessionId = session.session.id;
    next();
  } catch (err) {
    req.log.error({ err }, "Authentication middleware error");
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function clearAuthenticatedSession(
  req: Request,
  res: Response,
): Promise<void> {
  const sessionToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof sessionToken === "string" && sessionToken.length > 0) {
    const { deleteSession } = await import("./session-service");
    await deleteSession(sessionToken);
  }
  clearSessionCookies(res);
}
