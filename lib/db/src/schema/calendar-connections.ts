import { pgTable, text, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const calendarConnectionsTable = pgTable("calendar_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("google"),
  encryptedAccessToken: text("encrypted_access_token"),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  grantedScopes: text("granted_scopes"),
  providerAccountEmail: text("provider_account_email"),
  providerAccountSub: text("provider_account_sub"),
  selectedReadCalendarIds: jsonb("selected_read_calendar_ids").$type<string[]>().notNull().default([]),
  writeCalendarId: text("write_calendar_id"),
  status: text("status").notNull().default("active"),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCalendarConnectionSchema = createInsertSchema(calendarConnectionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectCalendarConnectionSchema = createSelectSchema(calendarConnectionsTable);
export type InsertCalendarConnection = z.infer<typeof insertCalendarConnectionSchema>;
export type CalendarConnection = typeof calendarConnectionsTable.$inferSelect;
