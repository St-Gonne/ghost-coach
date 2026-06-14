import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const authSessionsTable = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    csrfTokenHash: text("csrf_token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionTokenHashIdx: uniqueIndex("auth_sessions_session_token_hash_idx").on(
      table.sessionTokenHash,
    ),
  }),
);

export const insertAuthSessionSchema = createInsertSchema(
  authSessionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const selectAuthSessionSchema = createSelectSchema(authSessionsTable);
export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;
export type AuthSession = typeof authSessionsTable.$inferSelect;
