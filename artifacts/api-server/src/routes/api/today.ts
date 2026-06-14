import { Router } from "express";
import { db } from "@workspace/db";
import {
  userSettingsTable,
  locationsTable,
  activityTemplatesTable,
  routinePrescriptionsTable,
  dailyPlansTable,
  planItemsTable,
  activityLogsTable,
} from "@workspace/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { PlanItemActionBody, PlanItemActionParams } from "@workspace/api-zod";
import { getAdapters } from "../../integrations";
import { createDailyPlan } from "../../planner/create-daily-plan";
import { actionToTransition } from "../../coaching/plan-state-machine";
import { localDateString } from "../../domain/time";
import type {
  ActivityFeatures,
  Candidate,
  CoachingSettings,
  LocationFeatures,
  PlanItemState,
} from "../../domain/types";
import { subDays } from "date-fns";
import { requireRequestUser } from "../../auth/user";

const router = Router();
const COMPLETED_OUTCOMES = new Set(["done", "partial"]);

async function getItemWithTemplate(id: string | null | undefined) {
  if (!id) return null;
  const rows = await db
    .select()
    .from(planItemsTable)
    .where(eq(planItemsTable.id, id))
    .limit(1);
  if (!rows[0]) return null;
  const item = rows[0];
  const [template] = await db
    .select()
    .from(activityTemplatesTable)
    .where(eq(activityTemplatesTable.id, item.activityTemplateId))
    .limit(1);
  return { ...item, activityTemplate: template ?? null };
}

async function buildTodayResponse(userId: string, localDate: string) {
  const planRows = await db
    .select()
    .from(dailyPlansTable)
    .where(
      and(
        eq(dailyPlansTable.userId, userId),
        eq(dailyPlansTable.localDate, localDate),
      ),
    )
    .orderBy(desc(dailyPlansTable.version))
    .limit(1);

  const plan = planRows[0] ?? null;
  if (!plan) {
    return {
      planId: null,
      date: localDate,
      status: "no_plan",
      plannerMode: "deterministic_fallback",
      reasoningSummary: null,
      morningMessage: null,
      primaryItem: null,
      backupItem: null,
      minimumWinItem: null,
      location: null,
      weatherSummary: null,
      integrationWarnings: [],
    };
  }

  const [primaryItem, backupItem, minimumWinItem] = await Promise.all([
    getItemWithTemplate(plan.primaryPlanItemId),
    getItemWithTemplate(plan.backupPlanItemId),
    getItemWithTemplate(plan.minimumWinPlanItemId),
  ]);

  const locationId =
    primaryItem?.locationId ??
    backupItem?.locationId ??
    minimumWinItem?.locationId;
  const location = locationId
    ? ((
        await db
          .select()
          .from(locationsTable)
          .where(eq(locationsTable.id, locationId))
          .limit(1)
      )[0] ?? null)
    : null;

  return {
    planId: plan.id,
    date: localDate,
    status: plan.status,
    plannerMode: plan.plannerMode,
    reasoningSummary: plan.reasoningSummary,
    morningMessage: plan.reasoningSummary,
    primaryItem,
    backupItem,
    minimumWinItem,
    location,
    weatherSummary: null,
    integrationWarnings: [],
  };
}

function sameInstant(a: Date | string, b: Date | string): boolean {
  return new Date(a).getTime() === new Date(b).getTime();
}

function sameCandidateAndItem(
  candidate: Candidate | undefined,
  item: {
    activityTemplateId: string;
    scheduledStartAt: Date;
    scheduledEndAt: Date;
    locationId: string | null;
  } | null,
): boolean {
  if (!candidate || !item) return !candidate && !item;
  return (
    candidate.activityTemplateId === item.activityTemplateId &&
    candidate.locationId === item.locationId &&
    sameInstant(candidate.windowStart, item.scheduledStartAt) &&
    sameInstant(candidate.windowEnd, item.scheduledEndAt)
  );
}

router.get("/today", async (req, res) => {
  try {
    const user = requireRequestUser(req);

    const localDate = localDateString(user.timezone);
    return res.json(await buildTodayResponse(user.id, localDate));
  } catch (err) {
    req.log.error({ err }, "GET /today error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/today/replan", async (req, res) => {
  try {
    const user = requireRequestUser(req);

    const [settingsRow] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, user.id))
      .limit(1);
    if (!settingsRow)
      return res.status(400).json({ error: "Settings not configured" });

    const locationRows = await db
      .select()
      .from(locationsTable)
      .where(
        and(
          eq(locationsTable.userId, user.id),
          eq(locationsTable.isDefault, true),
        ),
      )
      .limit(1);
    const locationRow =
      locationRows[0] ??
      (
        await db
          .select()
          .from(locationsTable)
          .where(eq(locationsTable.userId, user.id))
          .limit(1)
      )[0];
    if (!locationRow)
      return res.status(400).json({ error: "No location configured" });

    const activities = await db
      .select()
      .from(activityTemplatesTable)
      .where(
        and(
          eq(activityTemplatesTable.userId, user.id),
          eq(activityTemplatesTable.active, true),
        ),
      );

    const activeRoutines = await db
      .select()
      .from(routinePrescriptionsTable)
      .where(
        and(
          eq(routinePrescriptionsTable.userId, user.id),
          eq(routinePrescriptionsTable.active, true),
        ),
      );

    const recentLogs = await db
      .select()
      .from(activityLogsTable)
      .where(
        and(
          eq(activityLogsTable.userId, user.id),
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
      weatherRainProbabilityLimit:
        settingsRow.weatherRainProbabilityLimit ?? 60,
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
      locationType:
        locationRow.locationType as LocationFeatures["locationType"],
      hasFloorSpace: locationRow.hasFloorSpace,
      hasPool: locationRow.hasPool,
      hasStairs: locationRow.hasStairs,
      hasIndoorWalk: locationRow.hasIndoorWalk,
      hasShower: locationRow.hasShower,
      publicPrivacyLevel:
        locationRow.publicPrivacyLevel as LocationFeatures["publicPrivacyLevel"],
      typicalTravelOverheadMinutes: locationRow.typicalTravelOverheadMinutes,
    };

    const activityFeatures: ActivityFeatures[] = activities.map((activity) => ({
      id: activity.id,
      name: activity.name,
      category: activity.category as ActivityFeatures["category"],
      goalTags: (activity.goalTags as string[]) ?? [],
      minimumMinutes: activity.minimumMinutes,
      preferredMinutes: activity.preferredMinutes,
      maximumMinutes: activity.maximumMinutes,
      intensity: activity.intensity as ActivityFeatures["intensity"],
      requiresFloorSpace: activity.requiresFloorSpace,
      requiresPool: activity.requiresPool,
      requiresStairs: activity.requiresStairs,
      requiresShower: activity.requiresShower,
      requiresEquipment: (activity.requiresEquipment as string[]) ?? [],
      minimumPrivacy:
        activity.minimumPrivacy as ActivityFeatures["minimumPrivacy"],
      publicSuitability: activity.publicSuitability,
      weatherMode: activity.weatherMode as ActivityFeatures["weatherMode"],
      allowedLocationTypes:
        (activity.allowedLocationTypes as ActivityFeatures["allowedLocationTypes"]) ??
        [],
      preferenceScore: activity.preferenceScore,
      isPhysioApproved: activity.isPhysioApproved,
      active: activity.active,
    }));

    const adapters = getAdapters();
    const localDate = localDateString(user.timezone);
    const dueRoutineIds = Object.entries(routineRulesByActivityId)
      .filter(([, rule]) => rule.due)
      .map(([activityId]) => activityId);

    const result = await createDailyPlan({
      userId: user.id,
      localDate,
      timezone: user.timezone,
      activities: activityFeatures,
      location,
      calendar: adapters.calendar,
      weather: adapters.weather,
      llm: adapters.llm,
      settings,
      recentActivityIds: completedLogs.map((log) => log.activityTemplateId),
      activeRoutinePrescriptionIds: dueRoutineIds,
      routineRulesByActivityId,
      lastCompletedAtByActivityId,
      isPhysioRoutineActive: activeRoutines.length > 0,
    });

    const existingPlans = await db
      .select()
      .from(dailyPlansTable)
      .where(
        and(
          eq(dailyPlansTable.userId, user.id),
          eq(dailyPlansTable.localDate, localDate),
        ),
      )
      .orderBy(desc(dailyPlansTable.version))
      .limit(1);
    const existing = existingPlans[0] ?? null;

    const primaryCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selected.primaryCandidateId,
    );
    const backupCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selected.backupCandidateId,
    );
    const minimumWinCandidate = result.candidates.find(
      (candidate) => candidate.id === result.selected.minimumWinCandidateId,
    );

    if (existing) {
      const [existingPrimary, existingBackup, existingMinimum] =
        await Promise.all([
          existing.primaryPlanItemId
            ? db
                .select()
                .from(planItemsTable)
                .where(eq(planItemsTable.id, existing.primaryPlanItemId))
                .limit(1)
                .then((rows) => rows[0] ?? null)
            : Promise.resolve(null),
          existing.backupPlanItemId
            ? db
                .select()
                .from(planItemsTable)
                .where(eq(planItemsTable.id, existing.backupPlanItemId))
                .limit(1)
                .then((rows) => rows[0] ?? null)
            : Promise.resolve(null),
          existing.minimumWinPlanItemId
            ? db
                .select()
                .from(planItemsTable)
                .where(eq(planItemsTable.id, existing.minimumWinPlanItemId))
                .limit(1)
                .then((rows) => rows[0] ?? null)
            : Promise.resolve(null),
        ]);

      const sameNoPlan =
        !result.hasViablePlan && existing.status === "no_viable_window";
      const sameViablePlan =
        result.hasViablePlan &&
        existing.status !== "superseded" &&
        sameCandidateAndItem(primaryCandidate, existingPrimary) &&
        sameCandidateAndItem(backupCandidate, existingBackup) &&
        sameCandidateAndItem(minimumWinCandidate, existingMinimum);

      if (sameNoPlan || sameViablePlan) {
        return res.json(await buildTodayResponse(user.id, localDate));
      }

      await db
        .update(dailyPlansTable)
        .set({ status: "superseded", updatedAt: new Date() })
        .where(eq(dailyPlansTable.id, existing.id));
    }

    const [plan] = await db
      .insert(dailyPlansTable)
      .values({
        userId: user.id,
        localDate,
        version: (existing?.version ?? 0) + 1,
        status: result.hasViablePlan ? "published" : "no_viable_window",
        plannerMode: result.mode,
        reasoningSummary: result.morningMessage,
      })
      .returning();
    if (!plan) return res.status(500).json({ error: "Failed to create plan" });

    async function insertItem(candidate: Candidate | undefined, role: string) {
      if (!candidate) return null;
      const rows = await db
        .insert(planItemsTable)
        .values({
          dailyPlanId: plan.id,
          activityTemplateId: candidate.activityTemplateId,
          role,
          scheduledStartAt: candidate.windowStart,
          scheduledEndAt: candidate.windowEnd,
          locationId: location.id,
          locationLabelSnapshot: location.label,
          candidateScore: candidate.score,
          selectionReason: result.selected.reasoningSummary,
          state: "proposed",
        })
        .returning();
      return rows[0] ?? null;
    }

    const [primaryItem, backupItem, minimumWinItem] = await Promise.all([
      insertItem(primaryCandidate, "primary"),
      insertItem(backupCandidate, "backup"),
      insertItem(minimumWinCandidate, "minimum_win"),
    ]);

    await db
      .update(dailyPlansTable)
      .set({
        primaryPlanItemId: primaryItem?.id,
        backupPlanItemId: backupItem?.id,
        minimumWinPlanItemId: minimumWinItem?.id,
      })
      .where(eq(dailyPlansTable.id, plan.id));

    return res.json(await buildTodayResponse(user.id, localDate));
  } catch (err) {
    req.log.error({ err }, "POST /today/replan error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/plan-items/:id/action", async (req, res) => {
  try {
    const params = PlanItemActionParams.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid ID" });

    const parsed = PlanItemActionBody.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Validation error", details: parsed.error.issues });
    }

    const [item] = await db
      .select()
      .from(planItemsTable)
      .where(eq(planItemsTable.id, params.data.id))
      .limit(1);
    if (!item) return res.status(404).json({ error: "Plan item not found" });

    const newState = actionToTransition(
      item.state as PlanItemState,
      parsed.data.action,
    );
    if (!newState) {
      return res.status(400).json({
        error: `Invalid action '${parsed.data.action}' from state '${item.state}'`,
      });
    }

    const [updated] = await db
      .update(planItemsTable)
      .set({ state: newState, updatedAt: new Date() })
      .where(eq(planItemsTable.id, item.id))
      .returning();

    if (["done", "partial", "skip"].includes(parsed.data.action)) {
      const user = requireRequestUser(req);
      await db.insert(activityLogsTable).values({
        userId: user.id,
        planItemId: item.id,
        activityTemplateId: item.activityTemplateId,
        startedAt: item.scheduledStartAt,
        endedAt: item.scheduledEndAt,
        actualMinutes: parsed.data.actualMinutes ?? null,
        outcome: parsed.data.action,
        skipReason: parsed.data.skipReason ?? null,
        source: "web",
        notesOptional: parsed.data.notes ?? null,
      });

      if (["done", "partial"].includes(parsed.data.action)) {
        await db
          .update(dailyPlansTable)
          .set({ status: "completed", updatedAt: new Date() })
          .where(eq(dailyPlansTable.id, item.dailyPlanId));
      }
    }

    const [template] = await db
      .select()
      .from(activityTemplatesTable)
      .where(eq(activityTemplatesTable.id, item.activityTemplateId))
      .limit(1);

    return res.json({ ...updated, activityTemplate: template ?? null });
  } catch (err) {
    req.log.error({ err }, "POST /plan-items/:id/action error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
