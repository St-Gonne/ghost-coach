import { pgTable, text, boolean, timestamp, uuid, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const locationsTable = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  locationType: text("location_type").notNull().default("home"),
  hasFloorSpace: boolean("has_floor_space").notNull().default(false),
  hasPool: boolean("has_pool").notNull().default(false),
  hasStairs: boolean("has_stairs").notNull().default(false),
  hasIndoorWalk: boolean("has_indoor_walk").notNull().default(false),
  hasShower: boolean("has_shower").notNull().default(false),
  publicPrivacyLevel: text("public_privacy_level").notNull().default("private"),
  typicalTravelOverheadMinutes: integer("typical_travel_overhead_minutes").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLocationSchema = createInsertSchema(locationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectLocationSchema = createSelectSchema(locationsTable);
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locationsTable.$inferSelect;
