import { beforeEach, describe, expect, it, vi } from "vitest";

describe("token-crypto", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.TOKEN_ENCRYPTION_KEY_BASE64 = Buffer.alloc(32, 7).toString(
      "base64",
    );
  });

  it("round-trips an encrypted token", async () => {
    const { encryptToken, decryptToken } = await import(
      "../../src/auth/token-crypto"
    );

    const encrypted = encryptToken("refresh-token-123");

    expect(encrypted).not.toContain("refresh-token-123");
    expect(decryptToken(encrypted)).toBe("refresh-token-123");
  });

  it("rejects invalid payloads", async () => {
    const { decryptToken } = await import("../../src/auth/token-crypto");

    expect(() => decryptToken("bad-payload")).toThrow(
      "Invalid encrypted token payload",
    );
  });
});
