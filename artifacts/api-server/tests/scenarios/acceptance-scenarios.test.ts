/**
 * Phase 1 Acceptance Scenario Tests
 * Runs all 8 spec scenarios (Section 22.3) directly through createDailyPlan.
 * Each test prints a structured table so results can be quoted in the audit report.
 */
import { describe, it, expect } from "vitest";
import { createDailyPlan } from "../../src/planner/create-daily-plan";
import { selectDeterministically } from "../../src/planner/selection-policy";
import type {
  ActivityFeatures,
  LocationFeatures,
  CoachingSettings,
  CalendarEvent,
} from "../../src/domain/types";
import type { CalendarAdapter } from "../../src/integrations/calendar";
import type { WeatherAdapter } from "../../src/integrations/weather";
import type { LLMAdapter } from "../../src/integrations/llm";
import type { WeatherSnapshot } from "../../src/domain/types";

// ─── Shared defaults ────────────────────────────────────────────────────────

const BASE_DATE = "2025-06-12";
const TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 3600 * 1000;

const SETTINGS: CoachingSettings = {
  dayStartLocalTime: "07:00",
  dayEndLocalTime: "21:00",
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  minimumFreeWindowMinutes: 10,
  transitionBufferMinutes: 10,
  coachingIntensity: 3,
  maxNudgesPerDay: 4,
  weatherHeatThresholdC: 35,
  weatherRainProbabilityLimit: 60,
  weatherWindLimitKph: 40,
  targetActiveDaysPerWeek: 4,
  preferCompletionOverProgression: true,
};

// ─── Locations ────────────────────────────────────────────────────────────────

const GOA_HOME: LocationFeatures = {
  id: "loc-goa-home",
  label: "Goa – Home",
  timezone: TIMEZONE,
  locationType: "home",
  hasFloorSpace: true,
  hasPool: false,
  hasStairs: false,
  hasIndoorWalk: false,
  hasShower: true,
  publicPrivacyLevel: "private",
  typicalTravelOverheadMinutes: 0,
  latitude: 15.2993,
  longitude: 74.124,
};

const AIRPORT: LocationFeatures = {
  id: "loc-airport",
  label: "Mumbai Airport – Terminal 2",
  timezone: TIMEZONE,
  locationType: "airport",
  hasFloorSpace: false,
  hasPool: false,
  hasStairs: false,
  hasIndoorWalk: true,
  hasShower: false,
  publicPrivacyLevel: "public",
  typicalTravelOverheadMinutes: 0,
  latitude: 19.0896,
  longitude: 72.8656,
};

const COFFEE_SHOP: LocationFeatures = {
  id: "loc-coffee-shop",
  label: "Coffee Shop",
  timezone: TIMEZONE,
  locationType: "coffee_shop",
  hasFloorSpace: false,
  hasPool: false,
  hasStairs: false,
  hasIndoorWalk: false,
  hasShower: false,
  publicPrivacyLevel: "public",
  typicalTravelOverheadMinutes: 0,
  latitude: 15.5,
  longitude: 73.8,
};

// ─── Activities ───────────────────────────────────────────────────────────────

const MORNING_WALK: ActivityFeatures = {
  id: "a-walk",
  name: "Morning Walk",
  category: "walk",
  goalTags: ["movement", "outdoor"],
  minimumMinutes: 15,
  preferredMinutes: 30,
  maximumMinutes: 60,
  intensity: "low",
  requiresFloorSpace: false,
  requiresPool: false,
  requiresStairs: false,
  requiresShower: false,
  requiresEquipment: [],
  minimumPrivacy: "public",
  publicSuitability: "visible",
  weatherMode: "outdoor",
  allowedLocationTypes: [],
  preferenceScore: 80,
  isPhysioApproved: false,
  active: true,
};

const INDOOR_WALK: ActivityFeatures = {
  id: "a-indoor-walk",
  name: "Indoor Walk",
  category: "walk",
  goalTags: ["movement"],
  minimumMinutes: 10,
  preferredMinutes: 20,
  maximumMinutes: 45,
  intensity: "low",
  requiresFloorSpace: false,
  requiresPool: false,
  requiresStairs: false,
  requiresShower: false,
  requiresEquipment: [],
  minimumPrivacy: "public",
  publicSuitability: "visible",
  weatherMode: "either",
  allowedLocationTypes: ["hotel", "airport", "coworking", "mall"],
  preferenceScore: 60,
  isPhysioApproved: false,
  active: true,
};

const DESK_STRETCHES: ActivityFeatures = {
  id: "a-stretch",
  name: "Desk Stretches",
  category: "stretch",
  goalTags: ["mobility"],
  minimumMinutes: 5,
  preferredMinutes: 10,
  maximumMinutes: 20,
  intensity: "low",
  requiresFloorSpace: false,
  requiresPool: false,
  requiresStairs: false,
  requiresShower: false,
  requiresEquipment: [],
  minimumPrivacy: "public",
  publicSuitability: "discreet",
  weatherMode: "either",
  allowedLocationTypes: [],
  preferenceScore: 55,
  isPhysioApproved: false,
  active: true,
};

const FLOOR_YOGA: ActivityFeatures = {
  id: "a-yoga",
  name: "Floor Yoga",
  category: "yoga",
  goalTags: ["mobility", "recovery"],
  minimumMinutes: 10,
  preferredMinutes: 20,
  maximumMinutes: 40,
  intensity: "low",
  requiresFloorSpace: true,
  requiresPool: false,
  requiresStairs: false,
  requiresShower: false,
  requiresEquipment: [],
  minimumPrivacy: "private",
  publicSuitability: "not_suitable",
  weatherMode: "either",
  allowedLocationTypes: [],
  preferenceScore: 65,
  isPhysioApproved: false,
  active: true,
};

const PHYSIO_UNAPPROVED: ActivityFeatures = {
  id: "a-physio-unapp",
  name: "Physio Routine",
  category: "physio",
  goalTags: ["rehab", "APT", "neck_trap"],
  minimumMinutes: 15,
  preferredMinutes: 25,
  maximumMinutes: 40,
  intensity: "moderate",
  requiresFloorSpace: true,
  requiresPool: false,
  requiresStairs: false,
  requiresShower: false,
  requiresEquipment: [],
  minimumPrivacy: "private",
  publicSuitability: "not_suitable",
  weatherMode: "either",
  allowedLocationTypes: [],
  preferenceScore: 90,
  isPhysioApproved: false,
  active: true,
};

const PHYSIO_APPROVED: ActivityFeatures = {
  ...PHYSIO_UNAPPROVED,
  id: "a-physio-approved",
  name: "Physio Routine",
  isPhysioApproved: true,
};

const ALL_ACTIVITIES = [
  MORNING_WALK,
  INDOOR_WALK,
  DESK_STRETCHES,
  FLOOR_YOGA,
  PHYSIO_UNAPPROVED,
];
const ALL_ACTIVITIES_WITH_APPROVED_PHYSIO = [
  MORNING_WALK,
  INDOOR_WALK,
  DESK_STRETCHES,
  FLOOR_YOGA,
  PHYSIO_APPROVED,
];

// ─── Adapter factories ────────────────────────────────────────────────────────

function istToUtc(istHour: number, istMin = 0): Date {
  const d = new Date(`${BASE_DATE}T00:00:00Z`);
  d.setTime(d.getTime() + istHour * 3600000 + istMin * 60000 - IST_OFFSET_MS);
  return d;
}

// busyBlocks: [startHourFractional, endHourFractional] — e.g. 10.5 = 10:30 IST
function makeCalendar(
  busyBlocks: Array<[number, number]> = [],
): CalendarAdapter {
  return {
    connected: false,
    mock: true,
    listEvents: async () =>
      busyBlocks.map(
        ([startH, endH], i): CalendarEvent => ({
          id: `busy-${i}`,
          calendarId: "primary",
          startAt: istToUtc(startH),
          endAt: istToUtc(endH),
          isAllDay: false,
          isCancelled: false,
          isRemote: false,
          isInternal: true,
          isHighStakes: false,
          walkingCallEligible: false,
        }),
      ),
    createEvent: async () => ({ eventId: "mock-created" }),
    deleteEvent: async () => undefined,
    healthCheck: async () => ({ ok: true }),
  };
}

function makeWeather(
  snap: Partial<WeatherSnapshot> & { condition: string },
): WeatherAdapter {
  const full: WeatherSnapshot = {
    condition: snap.condition as WeatherSnapshot["condition"],
    temperatureC: snap.temperatureC ?? 27,
    rainProbabilityPercent: snap.rainProbabilityPercent ?? 5,
    windSpeedKph: snap.windSpeedKph ?? 10,
    summary: snap.summary ?? snap.condition,
    fetchedAt: new Date().toISOString(),
  };
  return {
    connected: false,
    mock: true,
    getWeather: async () => full,
    healthCheck: async () => ({ ok: true }),
  };
}

function makeLLM(): LLMAdapter {
  return {
    mock: true,
    connected: false,
    selectPlan: async (candidates) => ({
      ...selectDeterministically(candidates),
      reasoningSummary: "Mock LLM selected from prevalidated candidates.",
    }),
    healthCheck: async () => ({ ok: true }),
  };
}

// ─── Result printer ───────────────────────────────────────────────────────────

function printScenario(
  name: string,
  ctx: { location: string; weather: string; calendar: string; physio: string },
  result: Awaited<ReturnType<typeof createDailyPlan>>,
) {
  const passNames = result.candidates.map(
    (c) => `${c.activityName} (${c.role}, score ${c.score})`,
  );
  const rejNames = result.rejected.map(
    (c) => `${c.activityName}: ${c.rejectionReasons.join("; ")}`,
  );
  const sel = result.selected;
  const find = (id: string | undefined) =>
    result.candidates.find((c) => c.id === id);
  const primary = find(sel?.primaryCandidateId);
  const backup = find(sel?.backupCandidateId);
  const minWin = find(sel?.minimumWinCandidateId);

  console.log(`\n${"═".repeat(70)}`);
  console.log(`SCENARIO: ${name}`);
  console.log(`${"─".repeat(70)}`);
  console.log(`Location : ${ctx.location}`);
  console.log(`Weather  : ${ctx.weather}`);
  console.log(`Calendar : ${ctx.calendar}`);
  console.log(`Physio   : ${ctx.physio}`);
  console.log(`Mode     : ${result.mode}`);
  console.log(`${"─".repeat(70)}`);
  console.log(`PASSING CANDIDATES (${passNames.length}):`);
  passNames.forEach((n) => console.log(`  ✓ ${n}`));
  console.log(`REJECTED CANDIDATES (${rejNames.length}):`);
  rejNames.forEach((n) => console.log(`  ✗ ${n}`));
  console.log(`${"─".repeat(70)}`);
  console.log(
    `PRIMARY  : ${primary?.activityName ?? "—"} | ${primary?.locationLabel ?? "—"} | window ${primary ? new Date(primary.windowStart).toLocaleTimeString("en-IN", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }) : "—"}–${primary ? new Date(primary.windowEnd).toLocaleTimeString("en-IN", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }) : "—"} IST | score ${primary?.score ?? "—"}`,
  );
  console.log(
    `BACKUP   : ${backup?.activityName ?? "—"} | score ${backup?.score ?? "—"}`,
  );
  console.log(
    `MIN WIN  : ${minWin?.activityName ?? "—"} | score ${minWin?.score ?? "—"}`,
  );
  console.log(`REASONING: ${sel?.reasoningSummary ?? "—"}`);
}

const BASE = {
  userId: "scenario-user",
  localDate: BASE_DATE,
  timezone: TIMEZONE,
  settings: SETTINGS,
  recentActivityIds: [],
  activeRoutinePrescriptionIds: [],
  isPhysioRoutineActive: false,
};

// ─── Scenarios ────────────────────────────────────────────────────────────────

describe("Phase 1 Acceptance Scenarios (spec §22.3)", () => {
  it("S1: Normal Goa day — good weather, open calendar", async () => {
    const result = await createDailyPlan({
      ...BASE,
      activities: ALL_ACTIVITIES,
      location: GOA_HOME,
      calendar: makeCalendar(),
      weather: makeWeather({
        condition: "OUTDOOR_GOOD",
        temperatureC: 27,
        rainProbabilityPercent: 5,
        windSpeedKph: 12,
        summary: "Clear and pleasant — ideal for outdoor activity.",
      }),
      llm: makeLLM(),
    });

    printScenario(
      "S1 — Normal Goa day, good weather",
      {
        location: "Goa – Home (private, floor space, no pool)",
        weather: "OUTDOOR_GOOD · 27°C · rain 5% · wind 12 kph",
        calendar: "Open (no busy events)",
        physio: "Unapproved — not scheduled",
      },
      result,
    );

    expect(
      result.candidates.some(
        (c) => c.activityName === "Morning Walk" && c.isPassing,
      ),
    ).toBe(true);
    expect(
      result.rejected.some((c) => c.activityName === "Physio Routine"),
    ).toBe(true);
    expect(result.selected.primaryCandidateId).toBeTruthy();
  });

  it("S2: Hot/rainy day — outdoor blocked, fallback to indoor", async () => {
    const result = await createDailyPlan({
      ...BASE,
      activities: ALL_ACTIVITIES,
      location: GOA_HOME,
      calendar: makeCalendar(),
      weather: makeWeather({
        condition: "OUTDOOR_BLOCKED",
        temperatureC: 38,
        rainProbabilityPercent: 80,
        windSpeedKph: 20,
        summary: "Heavy rain and heat. Outdoor activity blocked.",
      }),
      llm: makeLLM(),
    });

    printScenario(
      "S2 — Hot/rainy day (OUTDOOR_BLOCKED)",
      {
        location: "Goa – Home (private, floor space)",
        weather: "OUTDOOR_BLOCKED · 38°C · rain 80%",
        calendar: "Open",
        physio: "Unapproved",
      },
      result,
    );

    expect(
      result.rejected.some(
        (c) =>
          c.activityName === "Morning Walk" &&
          c.rejectionReasons.some((r) => /weather/i.test(r)),
      ),
    ).toBe(true);
    const primaryId = result.selected.primaryCandidateId;
    const primary = result.candidates.find((c) => c.id === primaryId);
    expect(primary).toBeDefined();
    expect(["Desk Stretches", "Floor Yoga"]).toContain(primary?.activityName);
  });

  it("S3: Airport — long waiting window, indoor-only activities eligible", async () => {
    const result = await createDailyPlan({
      ...BASE,
      activities: ALL_ACTIVITIES,
      location: AIRPORT,
      calendar: makeCalendar([
        [7, 9],
        [15, 21],
      ]),
      weather: makeWeather({
        condition: "OUTDOOR_GOOD",
        temperatureC: 28,
        rainProbabilityPercent: 10,
        windSpeedKph: 8,
        summary: "Good weather — but we are indoors.",
      }),
      llm: makeLLM(),
    });

    printScenario(
      "S3 — Airport, long 09:00–15:00 free window",
      {
        location: "Mumbai Airport T2 (public, indoor walk available)",
        weather: "OUTDOOR_GOOD (irrelevant, indoors)",
        calendar: "Busy 07–09 + 15–21 → 6-hour free window 09–15",
        physio: "Unapproved",
      },
      result,
    );

    expect(
      result.candidates.some(
        (c) => c.activityName === "Indoor Walk" && c.isPassing,
      ),
    ).toBe(true);
    const primary = result.candidates.find(
      (candidate) => candidate.id === result.selected.primaryCandidateId,
    );
    expect(primary?.activityName).toBe("Indoor Walk");
    expect(
      result.rejected.some(
        (c) =>
          c.activityName === "Floor Yoga" &&
          c.rejectionReasons.some((r) => /floor space|privacy/i.test(r)),
      ),
    ).toBe(true);
  });

  it("S4: Coffee shop — 1-hour gap, floor activities rejected (privacy + floor space)", async () => {
    // Gap: 10:00–11:00 IST (1 h). In-person event buffers = 15 min each side.
    // Effective free window: 10:15–10:45 = 30 min (well above minimumFreeWindowMinutes=10).
    // Expected: Floor Yoga and Physio rejected (privacy + floor space); Desk Stretches/Walk pass.
    const result = await createDailyPlan({
      ...BASE,
      activities: ALL_ACTIVITIES,
      location: COFFEE_SHOP,
      calendar: makeCalendar([
        [7, 10],
        [11, 21],
      ]),
      weather: makeWeather({
        condition: "OUTDOOR_GOOD",
        temperatureC: 27,
        rainProbabilityPercent: 5,
        windSpeedKph: 8,
        summary: "Clear.",
      }),
      llm: makeLLM(),
    });

    printScenario(
      "S4 — Coffee shop, 30-minute gap at 10:00–10:30 IST",
      {
        location: "Coffee Shop (public, no floor space, no shower)",
        weather: "OUTDOOR_GOOD",
        calendar: "Busy 07:00–10:00 + 10:30–21:00 → 30-min gap",
        physio: "Unapproved",
      },
      result,
    );

    expect(result.rejected.some((c) => c.activityName === "Floor Yoga")).toBe(
      true,
    );
    expect(
      result.rejected.some((c) => c.activityName === "Physio Routine"),
    ).toBe(true);
  });

  it("S4b: Coffee shop — fully blocked day returns a graceful no-plan result", async () => {
    const result = await createDailyPlan({
      ...BASE,
      activities: [DESK_STRETCHES, MORNING_WALK, FLOOR_YOGA, PHYSIO_UNAPPROVED],
      location: COFFEE_SHOP,
      calendar: makeCalendar([
        [7, 10],
        [10, 21],
      ]),
      weather: makeWeather({ condition: "OUTDOOR_GOOD", temperatureC: 27 }),
      llm: makeLLM(),
    });

    expect(result.hasViablePlan).toBe(false);
    expect(result.noPlanReason).toBe("NO_FREE_WINDOWS");
    expect(result.candidates).toHaveLength(0);
    expect(result.morningMessage).toMatch(/calendar unchanged/i);
  });

  it("S5: Packed calendar returns a graceful no-plan response instead of throwing", async () => {
    const result = await createDailyPlan({
      ...BASE,
      activities: [MORNING_WALK, FLOOR_YOGA, DESK_STRETCHES, PHYSIO_UNAPPROVED],
      location: GOA_HOME,
      calendar: makeCalendar([
        [7, 8],
        [8.13, 10],
        [10.13, 12],
        [12.13, 14],
        [14.13, 16],
        [16.13, 18],
        [18.13, 21],
      ]),
      weather: makeWeather({ condition: "OUTDOOR_GOOD", temperatureC: 27 }),
      llm: makeLLM(),
    });

    expect(result.hasViablePlan).toBe(false);
    expect(result.noPlanReason).toBe("NO_FREE_WINDOWS");
    expect(result.morningMessage).toMatch(/no safe movement window/i);
  });

  it("S6: Physio routine due — approved + active, must appear as passing candidate", async () => {
    const result = await createDailyPlan({
      ...BASE,
      activities: ALL_ACTIVITIES_WITH_APPROVED_PHYSIO,
      location: GOA_HOME,
      calendar: makeCalendar(),
      weather: makeWeather({
        condition: "OUTDOOR_GOOD",
        temperatureC: 27,
        rainProbabilityPercent: 5,
        windSpeedKph: 10,
        summary: "Good.",
      }),
      llm: makeLLM(),
      isPhysioRoutineActive: true,
      activeRoutinePrescriptionIds: ["a-physio-approved"],
    });

    printScenario(
      "S6 — Physio routine due (isPhysioApproved=true, active)",
      {
        location: "Goa – Home",
        weather: "OUTDOOR_GOOD",
        calendar: "Open",
        physio: "Approved + active",
      },
      result,
    );

    expect(
      result.candidates.some(
        (c) => c.activityName === "Physio Routine" && c.isPassing,
      ),
    ).toBe(true);
  });

  it("S7: Physio not approved — never appears in passing candidates", async () => {
    const result = await createDailyPlan({
      ...BASE,
      activities: ALL_ACTIVITIES,
      location: GOA_HOME,
      calendar: makeCalendar(),
      weather: makeWeather({
        condition: "OUTDOOR_GOOD",
        temperatureC: 27,
        rainProbabilityPercent: 5,
        windSpeedKph: 10,
        summary: "Good.",
      }),
      llm: makeLLM(),
      isPhysioRoutineActive: true,
    });

    printScenario(
      "S7 — Physio not approved (isPhysioApproved=false)",
      {
        location: "Goa – Home",
        weather: "OUTDOOR_GOOD",
        calendar: "Open",
        physio: "NOT approved — should always be rejected",
      },
      result,
    );

    expect(
      result.candidates.some(
        (c) => c.activityName === "Physio Routine" && c.isPassing,
      ),
    ).toBe(false);
    expect(
      result.rejected.some(
        (c) =>
          c.activityName === "Physio Routine" &&
          c.rejectionReasons.some((r) => /approved/i.test(r)),
      ),
    ).toBe(true);
  });

  it("S8: Planner runs are semantically deterministic and provide distinct fallbacks", async () => {
    const makeInput = () => ({
      ...BASE,
      activities: ALL_ACTIVITIES,
      location: GOA_HOME,
      calendar: makeCalendar(),
      weather: makeWeather({ condition: "OUTDOOR_GOOD", temperatureC: 27 }),
      llm: makeLLM(),
    });

    const run1 = await createDailyPlan(makeInput());
    const run2 = await createDailyPlan(makeInput());
    const selected = (
      result: typeof run1,
      key: "primaryCandidateId" | "backupCandidateId" | "minimumWinCandidateId",
    ) =>
      result.candidates.find(
        (candidate) => candidate.id === result.selected[key],
      );

    const primary1 = selected(run1, "primaryCandidateId");
    const primary2 = selected(run2, "primaryCandidateId");
    const backup1 = selected(run1, "backupCandidateId");
    const minimum1 = selected(run1, "minimumWinCandidateId");

    expect(primary1).toBeDefined();
    expect(primary2).toBeDefined();
    expect(primary1?.activityTemplateId).toBe(primary2?.activityTemplateId);
    expect(primary1?.windowStart.getTime()).toBe(
      primary2?.windowStart.getTime(),
    );
    expect(primary1?.durationMinutes).toBe(primary2?.durationMinutes);
    expect(backup1?.id).not.toBe(primary1?.id);
    expect(backup1?.windowStart.getTime()).not.toBe(
      primary1?.windowStart.getTime(),
    );
    expect(minimum1?.role).toBe("minimum_win");
    expect(minimum1!.durationMinutes).toBeLessThan(primary1!.durationMinutes);
  });
});
