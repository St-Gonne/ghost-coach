import { pgTable, text, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dailyPlansTable } from "./daily-plans";
import { activityTemplatesTable } from "./activity-templates";
import { locationsTable } from "./locations";

export const planItemsTable = pgTable("plan_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  dailyPlanId: uuid("daily_plan_id").notNull().references(() => dailyPlansTable.id, { onDelete: "cascade" }),
  activityTemplateId: uuid("activity_template_id").notNull().references(() => activityTemplatesTable.id),
  role: text("role").notNull().default("primary"),
  scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }).notNull(),
  scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }).notNull(),
  locationId: uuid("location_id").references(() => locationsTable.id),
  locationLabelSnapshot: text("location_label_snapshot"),
  candidateScore: real("candidate_score"),
  selectionReason: text("selection_reason"),
  state: text("state").notNull().default("proposed"),
  calendarEventId: text("calendar_event_id"),
  calendarEventHash: text("calendar_event_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlanItemSchema = createInsertSchema(planItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectPlanItemSchema = createSelectSchema(planItemsTable);
export type InsertPlanItem = z.infer<typeof insertPlanItemSchema>;
export type PlanItem = typeof planItemsTable.$inferSelect;
