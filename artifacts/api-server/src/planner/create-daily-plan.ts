import type { CalendarAdapter } from "../integrations/calendar";
import type { WeatherAdapter } from "../integrations/weather";
import type { LLMAdapter } from "../integrations/llm";
import type {
  ActivityFeatures,
  LocationFeatures,
  CoachingSettings,
  DailyContext,
  Candidate,
  SelectedPlan,
} from "../domain/types";
import { generateFreeWindows } from "./free-windows";
import { generateCandidates } from "./candidate-generator";
import { applyHardConstraints } from "./hard-constraints";
import { scoreCandidate } from "./scoring";
import { selectWithLLM } from "./llm-selector";
import { logger } from "../lib/logger";
import { zonedDayStart, zonedDayEnd } from "../domain/time";

export interface CreateDailyPlanInput {
  userId: string;
  localDate: string;
  timezone: string;
  activities: ActivityFeatures[];
  location: LocationFeatures;
  calendar: CalendarAdapter;
  weather: WeatherAdapter;
  llm: LLMAdapter;
  settings: CoachingSettings;
  recentActivityIds: string[];
  activeRoutinePrescriptionIds: string[];
  routineRulesByActivityId?: Record<
    string,
    { minimumGapHours: number; due: boolean }
  >;
  lastCompletedAtByActivityId?: Record<string, Date>;
  lastPhysioAt?: Date | null;
  isPhysioRoutineActive: boolean;
  weatherOverride?: string;
}

export interface DailyPlanResult {
  selected: SelectedPlan;
  hasViablePlan: boolean;
  noPlanReason?: "NO_FREE_WINDOWS" | "NO_VALID_ACTIVITIES";
  mode: "llm_assisted" | "deterministic_fallback";
  candidates: Candidate[];
  rejected: Candidate[];
  morningMessage: string;
  weatherCondition: string;
  locationLabel: string;
  context: DailyContext;
}

export async function createDailyPlan(
  input: CreateDailyPlanInput,
): Promise<DailyPlanResult> {
  const {
    userId,
    localDate,
    timezone,
    activities,
    location,
    calendar,
    weather: weatherAdapter,
    llm,
    settings,
    recentActivityIds,
    activeRoutinePrescriptionIds,
    routineRulesByActivityId = {},
    lastCompletedAtByActivityId = {},
    lastPhysioAt,
    isPhysioRoutineActive,
  } = input;

  const dayStart = zonedDayStart(localDate, timezone);
  const dayEnd = zonedDayEnd(localDate, timezone);

  const [calendarEvents, weatherSnapshot] = await Promise.all([
    calendar.listEvents(userId, dayStart, dayEnd),
    weatherAdapter.getWeather(
      location.latitude ?? 15.2993,
      location.longitude ?? 74.124,
      timezone,
      localDate,
    ),
  ]);

  const context: DailyContext = {
    userId,
    localDate,
    timezone,
    location,
    calendarEvents,
    weather: weatherSnapshot,
    recentActivityIds,
    activeRoutinePrescriptionIds,
  };

  const windows = generateFreeWindows({
    calendarEvents,
    localDate,
    timezone,
    settings,
  });

  logger.info(
    { windowCount: windows.length, localDate },
    "Generated free windows",
  );

  const allCandidates = generateCandidates({ activities, windows, location });

  logger.info(
    { candidateCount: allCandidates.length },
    "Generated raw candidates",
  );

  const passing: Candidate[] = [];
  const rejected: Candidate[] = [];

  for (const candidate of allCandidates) {
    const activity = activities.find(
      (a) => a.id === candidate.activityTemplateId,
    );
    if (!activity) continue;

    const rejectionReasons = applyHardConstraints(candidate, {
      activity,
      location,
      weather: weatherSnapshot,
      settings,
      lastCompletedAt: lastCompletedAtByActivityId[activity.id] ?? lastPhysioAt,
      routineRule: routineRulesByActivityId[activity.id],
      isPhysioRoutineActive,
      candidate,
    });

    if (rejectionReasons.length > 0) {
      rejected.push({ ...candidate, rejectionReasons, isPassing: false });
      continue;
    }

    const { score, breakdown } = scoreCandidate({
      activity,
      location,
      weather: weatherSnapshot,
      settings,
      timezone,
      recentActivityIds,
      isPhysioRoutineActive,
      activeRoutinePrescriptionIds,
      candidate,
    });

    passing.push({
      ...candidate,
      score,
      scoreBreakdown: breakdown,
      rejectionReasons: [],
      isPassing: true,
    });
  }

  logger.info(
    { passingCount: passing.length, rejectedCount: rejected.length },
    "Hard constraint pass complete",
  );

  if (passing.length === 0) {
    const noPlanReason =
      windows.length === 0 ? "NO_FREE_WINDOWS" : "NO_VALID_ACTIVITIES";
    const morningMessage =
      noPlanReason === "NO_FREE_WINDOWS"
        ? "No safe movement window fits your calendar today. I have left the calendar unchanged and will re-plan if time opens up."
        : "No approved activity fits today's location and conditions. I have left the calendar unchanged.";

    return {
      selected: {
        primaryCandidateId: "",
        backupCandidateId: "",
        minimumWinCandidateId: "",
        reasoningSummary: morningMessage,
        caution: "time_pressure",
      },
      hasViablePlan: false,
      noPlanReason,
      mode: "deterministic_fallback",
      candidates: [],
      rejected,
      morningMessage,
      weatherCondition: weatherSnapshot.condition,
      locationLabel: location.label,
      context,
    };
  }

  const { plan: selected, mode } = await selectWithLLM(llm, passing, context);

  const topCandidate = passing.find(
    (c) => c.id === selected.primaryCandidateId,
  );
  const morningMessage = `Your movement plan for ${localDate}: ${topCandidate?.activityName ?? "an activity"} at ${location.label}. ${selected.reasoningSummary}`;

  return {
    selected,
    hasViablePlan: true,
    mode,
    candidates: passing,
    rejected,
    morningMessage,
    weatherCondition: weatherSnapshot.condition,
    locationLabel: location.label,
    context,
  };
}
