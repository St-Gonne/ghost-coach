import { beforeEach, describe, expect, it, vi } from "vitest";

function makeResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

describe("authenticateApiRequest", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows mock mode requests and attaches the seeded user", async () => {
    vi.doMock("../../src/config", () => ({
      config: { mockIntegrations: true, allowedEmail: "", nodeEnv: "test" },
    }));
    vi.doMock("@workspace/db", () => ({
      db: {
        select: () => ({
          from: () => ({
            limit: async () => [
              { id: "user-1", email: "mock@example.com", displayName: "Mock", timezone: "Asia/Kolkata", isActive: true },
            ],
          }),
        }),
      },
    }));

    const { authenticateApiRequest } = await import(
      "../../src/auth/session-middleware"
    );

    const req = {
      method: "GET",
      path: "/today",
      cookies: {},
      log: { error: vi.fn() },
    } as any;
    const res = makeResponse() as any;
    const next = vi.fn();

    await authenticateApiRequest(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.ghostCoachUser?.email).toBe("mock@example.com");
  });

  it("rejects real-mode requests without a session cookie", async () => {
    vi.doMock("../../src/config", () => ({
      config: { mockIntegrations: false, allowedEmail: "sharan@example.com", nodeEnv: "test" },
    }));
    vi.doMock("../../src/auth/cookies", () => ({
      SESSION_COOKIE_NAME: "ghost_coach_session",
      CSRF_COOKIE_NAME: "ghost_coach_csrf",
      clearSessionCookies: vi.fn(),
    }));

    const { authenticateApiRequest } = await import(
      "../../src/auth/session-middleware"
    );

    const req = {
      method: "GET",
      path: "/today",
      cookies: {},
      log: { error: vi.fn() },
    } as any;
    const res = makeResponse() as any;
    const next = vi.fn();

    await authenticateApiRequest(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
