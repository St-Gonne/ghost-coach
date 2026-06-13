import { pgTable, text, boolean, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { activityTemplatesTable } from "./activity-templates";

export const routinePrescriptionsTable = pgTable("routine_prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  activityTemplateId: uuid("activity_template_id").notNull().references(() => activityTemplatesTable.id, { onDelete: "cascade" }),
  sourceLabel: text("source_label").notNull(),
  approvedOrPrescribedBy: text("approved_or_prescribed_by"),
  targetFrequencyPerWeek: integer("target_frequency_per_week").notNull().default(3),
  minimumGapHours: integer("minimum_gap_hours").notNull().default(24),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
  reviewAfter: timestamp("review_after", { withTimezone: true }),
  notes: text("notes"),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoutinePrescriptionSchema = createInsertSchema(routinePrescriptionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectRoutinePrescriptionSchema = createSelectSchema(routinePrescriptionsTable);
export type InsertRoutinePrescription = z.infer<typeof insertRoutinePrescriptionSchema>;
export type RoutinePrescription = typeof routinePrescriptionsTable.$inferSelect;
