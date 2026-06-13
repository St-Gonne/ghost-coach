import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  userSettingsTable,
  dailyPlansTable,
  planItemsTable,
  activityLogsTable,
  activityTemplatesTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns";

const router = Router();

async function getFirstUser() {
  const users = await db.select().from(usersTable).limit(1);
  return users[0] ?? null;
}

router.get("/week", async (req, res) => {
  try {
    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const settings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, user.id))
      .limit(1);

    const targetDays = settings[0]?.targetActiveDaysPerWeek ?? 4;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const weekEndStr = format(weekEnd, "yyyy-MM-dd");

    const plans = await db
      .select()
      .from(dailyPlansTable)
      .where(
        and(
          eq(dailyPlansTable.userId, user.id),
          gte(dailyPlansTable.localDate, weekStartStr),
          lte(dailyPlansTable.localDate, weekEndStr),
        ),
      );

    const logs = await db
      .select()
      .from(activityLogsTable)
      .where(
        and(
          eq(activityLogsTable.userId, user.id),
          gte(activityLogsTable.createdAt, weekStart),
          lte(activityLogsTable.createdAt, weekEnd),
        ),
      );

    const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayLogs = logs.filter((l) => {
        const logDate = l.startedAt ?? l.createdAt;
        return format(logDate, "yyyy-MM-dd") === dateStr;
      });
      const done = dayLogs.find((l) => l.outcome === "done" || l.outcome === "partial");
      return {
        date: dateStr,
        outcome: done ? done.outcome : "none",
        activityName: null as string | null,
        minutes: done?.actualMinutes ?? null,
      };
    });

    const activeDayDates = days
      .filter((d) => d.outcome === "done" || d.outcome === "partial")
      .map((d) => d.date);

    const completedMinutes = logs.reduce((sum, l) => sum + (l.actualMinutes ?? 0), 0);
    const plannedMinutes = plans.length > 0 ? plans.length * 30 : 0;

    const physioLogs = logs.filter((l) => {
      return false;
    });

    return res.json({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      activeDaysCompleted: activeDayDates.length,
      targetActiveDays: targetDays,
      activeDayDates,
      completionRate:
        activeDayDates.length > 0 ? (activeDayDates.length / targetDays) * 100 : 0,
      plannedMinutes,
      completedMinutes,
      physioSessions: physioLogs.length,
      physioTarget: 3,
      days,
    });
  } catch (err) {
    req.log.error({ err }, "GET /week error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
