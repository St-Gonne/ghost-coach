import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, authSessionsTable, usersTable } from "@workspace/db";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashToken(value: string): string {
  return sha256(value);
}

export async function createSession(userId: string): Promise<{
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
}> {
  const sessionToken = randomToken();
  const csrfToken = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(authSessionsTable).values({
    userId,
    sessionTokenHash: sha256(sessionToken),
    csrfTokenHash: sha256(csrfToken),
    expiresAt,
  });

  return { sessionToken, csrfToken, expiresAt };
}

export async function getSessionByToken(sessionToken: string) {
  const rows = await db
    .select({
      session: authSessionsTable,
      user: usersTable,
    })
    .from(authSessionsTable)
    .innerJoin(usersTable, eq(authSessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(authSessionsTable.sessionTokenHash, sha256(sessionToken)),
        gt(authSessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function deleteSession(sessionToken: string): Promise<void> {
  await db
    .delete(authSessionsTable)
    .where(eq(authSessionsTable.sessionTokenHash, sha256(sessionToken)));
}

export async function deleteExpiredSessions(): Promise<void> {
  await db
    .delete(authSessionsTable)
    .where(lt(authSessionsTable.expiresAt, new Date()));
}

export async function validateCsrfToken(
  sessionToken: string,
  csrfToken: string,
): Promise<boolean> {
  const session = await getSessionByToken(sessionToken);
  if (!session) return false;

  return session.session.csrfTokenHash === sha256(csrfToken);
}
