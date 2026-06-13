import { pgTable, text, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const scheduledJobsTable = pgTable("scheduled_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  payload: jsonb("payload"),
  status: text("status").notNull().default("pending"),
  dedupeKey: text("dedupe_key").notNull().unique(),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertScheduledJobSchema = createInsertSchema(scheduledJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectScheduledJobSchema = createSelectSchema(scheduledJobsTable);
export type InsertScheduledJob = z.infer<typeof insertScheduledJobSchema>;
export type ScheduledJob = typeof scheduledJobsTable.$inferSelect;
