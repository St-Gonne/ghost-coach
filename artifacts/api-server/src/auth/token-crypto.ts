import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { config } from "../config";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = config.tokenEncryptionKeyBase64;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY_BASE64 is required for real integrations");
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes");
  }

  return key;
}

export function encryptToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptToken(payload: string | null | undefined): string | null {
  if (!payload) return null;

  const [version, ivPart, tagPart, cipherPart] = payload.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !cipherPart) {
    throw new Error("Invalid encrypted token payload");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(cipherPart, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
