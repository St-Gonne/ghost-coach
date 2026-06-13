import { pgTable, text, boolean, timestamp, uuid, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const activityTemplatesTable = pgTable("activity_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  goalTags: jsonb("goal_tags").$type<string[]>().notNull().default([]),
  minimumMinutes: integer("minimum_minutes").notNull().default(10),
  preferredMinutes: integer("preferred_minutes").notNull().default(30),
  maximumMinutes: integer("maximum_minutes").notNull().default(60),
  intensity: text("intensity").notNull().default("moderate"),
  requiresFloorSpace: boolean("requires_floor_space").notNull().default(false),
  requiresPool: boolean("requires_pool").notNull().default(false),
  requiresStairs: boolean("requires_stairs").notNull().default(false),
  requiresShower: boolean("requires_shower").notNull().default(false),
  requiresEquipment: jsonb("requires_equipment").$type<string[]>().notNull().default([]),
  minimumPrivacy: text("minimum_privacy").notNull().default("public"),
  publicSuitability: text("public_suitability").notNull().default("visible"),
  weatherMode: text("weather_mode").notNull().default("either"),
  allowedLocationTypes: jsonb("allowed_location_types").$type<string[]>().notNull().default([]),
  preferenceScore: integer("preference_score").notNull().default(50),
  active: boolean("active").notNull().default(true),
  isPhysioApproved: boolean("is_physio_approved").notNull().default(false),
  instructionsMarkdown: text("instructions_markdown"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityTemplateSchema = createInsertSchema(activityTemplatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectActivityTemplateSchema = createSelectSchema(activityTemplatesTable);
export type InsertActivityTemplate = z.infer<typeof insertActivityTemplateSchema>;
export type ActivityTemplate = typeof activityTemplatesTable.$inferSelect;
