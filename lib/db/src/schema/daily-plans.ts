import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { dailyContextsTable } from "./daily-contexts";

export const dailyPlansTable = pgTable("daily_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  localDate: text("local_date").notNull(),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  dailyContextId: uuid("daily_context_id").references(() => dailyContextsTable.id),
  plannerMode: text("planner_mode").notNull().default("deterministic_fallback"),
  reasoningSummary: text("reasoning_summary"),
  primaryPlanItemId: uuid("primary_plan_item_id"),
  backupPlanItemId: uuid("backup_plan_item_id"),
  minimumWinPlanItemId: uuid("minimum_win_plan_item_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDailyPlanSchema = createInsertSchema(dailyPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectDailyPlanSchema = createSelectSchema(dailyPlansTable);
export type InsertDailyPlan = z.infer<typeof insertDailyPlanSchema>;
export type DailyPlan = typeof dailyPlansTable.$inferSelect;
