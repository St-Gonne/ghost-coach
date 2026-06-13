import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { locationsTable } from "./locations";

export const dailyContextsTable = pgTable("daily_contexts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  localDate: text("local_date").notNull(),
  timezone: text("timezone").notNull(),
  locationId: uuid("location_id").references(() => locationsTable.id),
  calendarSnapshotHash: text("calendar_snapshot_hash"),
  weatherSnapshot: jsonb("weather_snapshot"),
  recentActivitySummary: jsonb("recent_activity_summary"),
  contextQuality: text("context_quality").notNull().default("complete"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyContextSchema = createInsertSchema(dailyContextsTable).omit({ id: true });
export const selectDailyContextSchema = createSelectSchema(dailyContextsTable);
export type InsertDailyContext = z.infer<typeof insertDailyContextSchema>;
export type DailyContext = typeof dailyContextsTable.$inferSelect;
