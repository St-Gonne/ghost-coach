import { pgTable, text, integer, boolean, timestamp, uuid, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userSettingsTable = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),
  morningBriefLocalTime: text("morning_brief_local_time").notNull().default("07:30"),
  dayStartLocalTime: text("day_start_local_time").notNull().default("07:00"),
  dayEndLocalTime: text("day_end_local_time").notNull().default("21:30"),
  quietHoursStart: text("quiet_hours_start").notNull().default("22:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("07:00"),
  targetActiveDaysPerWeek: integer("target_active_days_per_week").notNull().default(4),
  minimumFreeWindowMinutes: integer("minimum_free_window_minutes").notNull().default(10),
  transitionBufferMinutes: integer("transition_buffer_minutes").notNull().default(10),
  coachingIntensity: integer("coaching_intensity").notNull().default(3),
  maxNudgesPerDay: integer("max_nudges_per_day").notNull().default(4),
  calendarWriteEnabled: boolean("calendar_write_enabled").notNull().default(true),
  defaultLocationId: uuid("default_location_id"),
  weatherHeatThresholdC: real("weather_heat_threshold_c").notNull().default(35),
  weatherRainProbabilityLimit: real("weather_rain_probability_limit").notNull().default(60),
  weatherWindLimitKph: real("weather_wind_limit_kph").notNull().default(40),
  preferCompletionOverProgression: boolean("prefer_completion_over_progression").notNull().default(true),
  weeklyReviewDay: text("weekly_review_day").notNull().default("Sunday"),
  weeklyReviewLocalTime: text("weekly_review_local_time").notNull().default("20:30"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectUserSettingsSchema = createSelectSchema(userSettingsTable);
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettingsTable.$inferSelect;
