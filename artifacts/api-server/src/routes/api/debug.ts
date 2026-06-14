import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  userSettingsTable,
  locationsTable,
  activityTemplatesTable,
  routinePrescriptionsTable,
  scheduledJobsTable,
  activityLogsTable,
} from "@workspace/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import {
  GetDebugPlanPreviewQueryParams,
  RunMockDayBody,
  RetryJobParams,
} from "@workspace/api-zod";
import { getDebugAdapters } from "../../integrations";
import { createDailyPlan } from "../../planner/create-daily-plan";
import { localDateString } from "../../domain/time";
import type {
  ActivityFeatures,
  LocationFeatures,
  CoachingSettings,
} from "../../domain/types";
import { subDays } from "date-fns";
import type { WeatherScenario } from "../../integrations/weather/mock-weather";

const router = Router();
const COMPLETED_OUTCOMES = new Set(["done", "partial"]);

async function getFirstUser() {
  const users = await db.select().from(usersTable).limit(1);
  return users[0] ?? null;
}

async function runPlanPreview(params: {
  userId: string;
  timezone: string;
  localDate: string;
  locationId?: string;
  weatherOverride?: string;
}) {
  const [settingsRow] = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, params.userId))
    .limit(1);

  if (!settingsRow) throw new Error("Settings not configured");

  let locationRow;
  if (params.locationId) {
    [locationRow] = await db
      .select()
      .from(locationsTable)
      .where(
        and(
          eq(locationsTable.id, params.locationId),
          eq(locationsTable.userId, params.userId),
        ),
      )
      .limit(1);
  }

  if (!locationRow) {
    [locationRow] = await db
      .select()
      .from(locationsTable)
      .where(
        and(
          eq(locationsTable.userId, params.userId),
          eq(locationsTable.isDefault, true),
        ),
      )
      .limit(1);
  }

  if (!locationRow) {
    [locationRow] = await db
      .select()
      .from(locationsTable)
      .where(eq(locationsTable.userId, params.userId))
      .limit(1);
  }

  if (!locationRow) throw new Error("No location configured");

  const activities = await db
    .select()
    .from(activityTemplatesTable)
    .where(
      and(
        eq(activityTemplatesTable.userId, params.userId),
        eq(activityTemplatesTable.active, true),
      ),
    );

  const activeRoutines = await db
    .select()
    .from(routinePrescriptionsTable)
    .where(
      and(
        eq(routinePrescriptionsTable.userId, params.userId),
        eq(routinePrescriptionsTable.active, true),
      ),
    );

  const recentLogs = await db
    .select()
    .from(activityLogsTable)
    .where(
      and(
        eq(activityLogsTable.userId, params.userId),
        gte(activityLogsTable.createdAt, subDays(new Date(), 7)),
      ),
    );

  const completedLogs = recentLogs.filter((log) =>
    COMPLETED_OUTCOMES.has(log.outcome),
  );
  const routineRulesByActivityId: Record<
    string,
    { minimumGapHours: number; due: boolean }
  > = {};
  const lastCompletedAtByActivityId: Record<string, Date> = {};

  for (const routine of activeRoutines) {
    const matching = completedLogs.filter(
      (log) => log.activityTemplateId === routine.activityTemplateId,
    );
    routineRulesByActivityId[routine.activityTemplateId] = {
      minimumGapHours: routine.minimumGapHours,
      due: matching.length < routine.targetFrequencyPerWeek,
    };
    const latest = matching
      .map((log) => log.endedAt ?? log.createdAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (latest)
      lastCompletedAtByActivityId[routine.activityTemplateId] = latest;
  }

  const settings: CoachingSettings = {
    dayStartLocalTime: settingsRow.dayStartLocalTime,
    dayEndLocalTime: settingsRow.dayEndLocalTime,
    quietHoursStart: settingsRow.quietHoursStart,
    quietHoursEnd: settingsRow.quietHoursEnd,
    minimumFreeWindowMinutes: settingsRow.minimumFreeWindowMinutes,
    transitionBufferMinutes: settingsRow.transitionBufferMinutes,
    coachingIntensity: settingsRow.coachingIntensity,
    maxNudgesPerDay: settingsRow.maxNudgesPerDay,
    weatherHeatThresholdC: settingsRow.weatherHeatThresholdC ?? 35,
    weatherRainProbabilityLimit: settingsRow.weatherRainProbabilityLimit ?? 60,
    weatherWindLimitKph: settingsRow.weatherWindLimitKph ?? 40,
    targetActiveDaysPerWeek: settingsRow.targetActiveDaysPerWeek,
    preferCompletionOverProgression:
      settingsRow.preferCompletionOverProgression,
  };

  const location: LocationFeatures = {
    id: locationRow.id,
    label: locationRow.label,
    latitude: locationRow.latitude,
    longitude: locationRow.longitude,
    timezone: locationRow.timezone,
    locationType: locationRow.locationType as LocationFeatures["locationType"],
    hasFloorSpace: locationRow.hasFloorSpace,
    hasPool: locationRow.hasPool,
    hasStairs: locationRow.hasStairs,
    hasIndoorWalk: locationRow.hasIndoorWalk,
    hasShower: locationRow.hasShower,
    publicPrivacyLevel:
      locationRow.publicPrivacyLevel as LocationFeatures["publicPrivacyLevel"],
    typicalTravelOverheadMinutes: locationRow.typicalTravelOverheadMinutes,
  };

  const activityFeatures: ActivityFeatures[] = activities.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category as ActivityFeatures["category"],
    goalTags: (a.goalTags as string[]) ?? [],
    minimumMinutes: a.minimumMinutes,
    preferredMinutes: a.preferredMinutes,
    maximumMinutes: a.maximumMinutes,
    intensity: a.intensity as ActivityFeatures["intensity"],
    requiresFloorSpace: a.requiresFloorSpace,
    requiresPool: a.requiresPool,
    requiresStairs: a.requiresStairs,
    requiresShower: a.requiresShower,
    requiresEquipment: (a.requiresEquipment as string[]) ?? [],
    minimumPrivacy: a.minimumPrivacy as ActivityFeatures["minimumPrivacy"],
    publicSuitability: a.publicSuitability,
    weatherMode: a.weatherMode as ActivityFeatures["weatherMode"],
    allowedLocationTypes:
      (a.allowedLocationTypes as ActivityFeatures["allowedLocationTypes"]) ??
      [],
    preferenceScore: a.preferenceScore,
    isPhysioApproved: a.isPhysioApproved,
    active: a.active,
  }));

  const adapters = getDebugAdapters(
    params.weatherOverride as WeatherScenario | undefined,
  );

  return createDailyPlan({
    userId: params.userId,
    localDate: params.localDate,
    timezone: params.timezone,
    activities: activityFeatures,
    location,
    calendar: adapters.calendar,
    weather: adapters.weather,
    llm: adapters.llm,
    settings,
    recentActivityIds: completedLogs.map((log) => log.activityTemplateId),
    activeRoutinePrescriptionIds: Object.entries(routineRulesByActivityId)
      .filter(([, rule]) => rule.due)
      .map(([activityId]) => activityId),
    routineRulesByActivityId,
    lastCompletedAtByActivityId,
    isPhysioRoutineActive: activeRoutines.length > 0,
  });
}

router.get("/debug/plan-preview", async (req, res) => {
  try {
    const query = GetDebugPlanPreviewQueryParams.safeParse(req.query);

    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const localDate =
      (query.success && query.data.date) || localDateString(user.timezone);

    const weatherOverride =
      typeof req.query.weatherOverride === "string"
        ? req.query.weatherOverride
        : undefined;

    const result = await runPlanPreview({
      userId: user.id,
      timezone: user.timezone,
      localDate,
      locationId: query.success ? query.data.locationId : undefined,
      weatherOverride,
    });

    const candidatesPayload = result.candidates.map((c) => ({
      id: c.id,
      activityTemplateId: c.activityTemplateId,
      activityName: c.activityName,
      role: c.role,
      windowStart: c.windowStart.toISOString(),
      windowEnd: c.windowEnd.toISOString(),
      locationId: c.locationId,
      locationLabel: c.locationLabel,
      score: c.score,
      scoreBreakdown: c.scoreBreakdown,
      rejectionReasons: c.rejectionReasons,
      isPassing: c.isPassing,
    }));

    const rejectedPayload = result.rejected.map((c) => ({
      id: c.id,
      activityTemplateId: c.activityTemplateId,
      activityName: c.activityName,
      role: c.role,
      windowStart: c.windowStart.toISOString(),
      windowEnd: c.windowEnd.toISOString(),
      locationId: c.locationId,
      locationLabel: c.locationLabel,
      score: 0,
      scoreBreakdown: {},
      rejectionReasons: c.rejectionReasons,
      isPassing: false,
    }));

    return res.json({
      date: localDate,
      candidates: candidatesPayload,
      rejected: rejectedPayload,
      selected: result.selected,
      morningMessage: result.morningMessage,
      plannerMode: result.mode,
      weatherCondition: result.weatherCondition,
      locationLabel: result.locationLabel,
      hasViablePlan: result.hasViablePlan,
      noPlanReason: result.noPlanReason,
    });
  } catch (err) {
    req.log.error({ err }, "GET /debug/plan-preview error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/debug/mock-day", async (req, res) => {
  try {
    const parsed = RunMockDayBody.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation error", details: parsed.error.issues });
    }

    const user = await getFirstUser();
    if (!user) return res.status(404).json({ error: "User not found" });

    const localDate = parsed.data.date || localDateString(user.timezone);

    const result = await runPlanPreview({
      userId: user.id,
      timezone: user.timezone,
      localDate,
      locationId: parsed.data.locationId,
      weatherOverride: parsed.data.weatherOverride,
    });

    const candidatesPayload = result.candidates.map((c) => ({
      id: c.id,
      activityTemplateId: c.activityTemplateId,
      activityName: c.activityName,
      role: c.role,
      windowStart: c.windowStart.toISOString(),
      windowEnd: c.windowEnd.toISOString(),
      locationId: c.locationId,
      locationLabel: c.locationLabel,
      score: c.score,
      scoreBreakdown: c.scoreBreakdown,
      rejectionReasons: c.rejectionReasons,
      isPassing: c.isPassing,
    }));

    const rejectedPayload = result.rejected.map((c) => ({
      id: c.id,
      activityTemplateId: c.activityTemplateId,
      activityName: c.activityName,
      role: c.role,
      windowStart: c.windowStart.toISOString(),
      windowEnd: c.windowEnd.toISOString(),
      locationId: c.locationId,
      locationLabel: c.locationLabel,
      score: 0,
      scoreBreakdown: {},
      rejectionReasons: c.rejectionReasons,
      isPassing: false,
    }));

    return res.json({
      date: localDate,
      candidates: candidatesPayload,
      rejected: rejectedPayload,
      selected: result.selected,
      morningMessage: result.morningMessage,
      plannerMode: result.mode,
      weatherCondition: result.weatherCondition,
      locationLabel: result.locationLabel,
      hasViablePlan: result.hasViablePlan,
      noPlanReason: result.noPlanReason,
    });
  } catch (err) {
    req.log.error({ err }, "POST /debug/mock-day error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/debug/jobs", async (req, res) => {
  try {
    const jobs = await db
      .select()
      .from(scheduledJobsTable)
      .orderBy(desc(scheduledJobsTable.dueAt))
      .limit(50);

    return res.json(jobs);
  } catch (err) {
    req.log.error({ err }, "GET /debug/jobs error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/debug/jobs/:id/retry", async (req, res) => {
  try {
    const params = RetryJobParams.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid ID" });

    const [rows] = await db
      .update(scheduledJobsTable)
      .set({
        status: "pending",
        attemptCount: 0,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(scheduledJobsTable.id, params.data.id))
      .returning();

    if (!rows) return res.status(404).json({ error: "Job not found" });
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "POST /debug/jobs/:id/retry error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
