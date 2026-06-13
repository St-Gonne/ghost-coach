import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { activityTemplatesTable } from "./activity-templates";
import { planItemsTable } from "./plan-items";

export const activityLogsTable = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  planItemId: uuid("plan_item_id").references(() => planItemsTable.id),
  activityTemplateId: uuid("activity_template_id").notNull().references(() => activityTemplatesTable.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  actualMinutes: integer("actual_minutes"),
  outcome: text("outcome").notNull(),
  skipReason: text("skip_reason"),
  painBefore: integer("pain_before"),
  painAfter: integer("pain_after"),
  source: text("source").notNull().default("web"),
  notesOptional: text("notes_optional"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });
export const selectActivityLogSchema = createSelectSchema(activityLogsTable);
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
