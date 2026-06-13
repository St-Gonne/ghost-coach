import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { planItemsTable } from "./plan-items";

export const nudgeEventsTable = pgTable("nudge_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  planItemId: uuid("plan_item_id").references(() => planItemsTable.id),
  nudgeType: text("nudge_type").notNull(),
  telegramMessageId: text("telegram_message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  responseAction: text("response_action"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNudgeEventSchema = createInsertSchema(nudgeEventsTable).omit({ id: true, createdAt: true });
export const selectNudgeEventSchema = createSelectSchema(nudgeEventsTable);
export type InsertNudgeEvent = z.infer<typeof insertNudgeEventSchema>;
export type NudgeEvent = typeof nudgeEventsTable.$inferSelect;
