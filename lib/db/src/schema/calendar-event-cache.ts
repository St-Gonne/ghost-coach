import { pgTable, text, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const calendarEventCacheTable = pgTable("calendar_event_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  providerEventId: text("provider_event_id").notNull(),
  calendarId: text("calendar_id").notNull(),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  titleRedacted: text("title_redacted"),
  locationText: text("location_text"),
  isAllDay: boolean("is_all_day").notNull().default(false),
  isCancelled: boolean("is_cancelled").notNull().default(false),
  isRemote: boolean("is_remote").notNull().default(false),
  isInternal: boolean("is_internal").notNull().default(false),
  isHighStakes: boolean("is_high_stakes").notNull().default(false),
  walkingCallEligible: boolean("walking_call_eligible").notNull().default(false),
  classificationSource: text("classification_source").notNull().default("rules"),
  eventHash: text("event_hash"),
  rawMinimalJson: jsonb("raw_minimal_json"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCalendarEventCacheSchema = createInsertSchema(calendarEventCacheTable).omit({ id: true });
export const selectCalendarEventCacheSchema = createSelectSchema(calendarEventCacheTable);
export type InsertCalendarEventCache = z.infer<typeof insertCalendarEventCacheSchema>;
export type CalendarEventCache = typeof calendarEventCacheTable.$inferSelect;
