import { describe, it, expect, beforeAll } from "vitest";
import { createDailyPlan } from "../../src/planner/create-daily-plan";
import { selectDeterministically } from "../../src/planner/selection-policy";
import type {
  ActivityFeatures,
  LocationFeatures,
  CoachingSettings,
} from "../../src/domain/types";
import type { CalendarAdapter } from "../../src/integrations/calendar";
import type { WeatherAdapter } from "../../src/integrations/weather";
import type { LLMAdapter } from "../../src/integrations/llm";

const DEFAULT_SETTINGS: CoachingSettings = {
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

const HOME_LOCATION: LocationFeatures = {
  id: "loc-home",
  label: "Home",
  timezone: "Asia/Kolkata",
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

const HOTEL_LOCATION: LocationFeatures = {
  id: "loc-hotel",
  label: "Mumbai Hotel",
  timezone: "Asia/Kolkata",
  locationType: "hotel",
  hasFloorSpace: true,
  hasPool: true,
  hasStairs: false,
  hasIndoorWalk: true,
  hasShower: true,
  publicPrivacyLevel: "semi_public",
  typicalTravelOverheadMinutes: 0,
  latitude: 19.076,
  longitude: 72.877,
};

const OUTDOOR_ACTIVITIES: ActivityFeatures[] = [
  {
    id: "a-walk",
    name: "Morning Walk",
    category: "walk",
    goalTags: ["outdoor"],
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
  },
  {
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
    minimumPrivacy: "semi_public",
    publicSuitability: "discreet",
    weatherMode: "either",
    allowedLocationTypes: [],
    preferenceScore: 55,
    isPhysioApproved: false,
    active: true,
  },
];

const PHYSIO_UNAPPROVED: ActivityFeatures = {
  id: "a-physio",
  name: "Physio Routine",
  category: "physio",
  goalTags: ["rehab"],
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
  isPhysioApproved: true,
};

const SWIM_ACTIVITY: ActivityFeatures = {
  id: "a-swim",
  name: "Swimming",
  category: "swim",
  goalTags: ["cardio"],
  minimumMinutes: 20,
  preferredMinutes: 30,
  maximumMinutes: 60,
  intensity: "moderate",
  requiresFloorSpace: false,
  requiresPool: true,
  requiresStairs: false,
  requiresShower: true,
  requiresEquipment: ["swimwear"],
  minimumPrivacy: "semi_public",
  publicSuitability: "visible",
  weatherMode: "either",
  allowedLocationTypes: [],
  preferenceScore: 75,
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
  allowedLocationTypes: ["hotel", "airport", "coworking"],
  preferenceScore: 60,
  isPhysioApproved: false,
  active: true,
};

function makeCalendar(
  busyISTHours: Array<[number, number]> = [],
): CalendarAdapter {
  return {
    connected: false,
    mock: true,
    listEvents: async () => {
      return busyISTHours.map(([startIST, endIST], i) => {
        const IST_OFFSET_MS = 5.5 * 3600 * 1000;
        const dateBase = new Date("2025-01-15T00:00:00Z");
        const s = new Date(
          dateBase.getTime() + startIST * 3600000 - IST_OFFSET_MS,
        );
        const e = new Date(
          dateBase.getTime() + endIST * 3600000 - IST_OFFSET_MS,
        );
        return {
          id: `busy-${i}`,
          calendarId: "primary",
          startAt: s,
          endAt: e,
          isAllDay: false,
          isCancelled: false,
          isRemote: false,
          isInternal: true,
          isHighStakes: false,
          walkingCallEligible: false,
        };
      });
    },
    createEvent: async () => ({ eventId: "mock-created" }),
    deleteEvent: async () => undefined,
    healthCheck: async () => ({ ok: true }),
  };
}

function makeWeather(
  condition: "OUTDOOR_GOOD" | "OUTDOOR_BLOCKED" | "OUTDOOR_CAUTION",
  overrides: Record<string, number> = {},
): WeatherAdapter {
  return {
    connected: false,
    mock: true,
    getWeather: async () => ({
      condition,
      temperatureC: overrides.temperatureC ?? 27,
      rainProbabilityPercent: overrides.rainProbabilityPercent ?? 5,
      windSpeedKph: overrides.windSpeedKph ?? 10,
      summary:
        condition === "OUTDOOR_GOOD"
          ? "Clear"
          : condition === "OUTDOOR_BLOCKED"
            ? "Heavy rain"
            : "Caution",
      fetchedAt: new Date().toISOString(),
    }),
    healthCheck: async () => ({ ok: true }),
  };
}

function makeLLM(): LLMAdapter {
  return {
    connected: false,
    mock: true,
    selectPlan: async (candidates) => ({
      ...selectDeterministically(candidates),
      reasoningSummary: "Integration test mock LLM selection",
    }),
    healthCheck: async () => ({ ok: true }),
  };
}

const BASE_INPUT = {
  userId: "test-user",
  localDate: "2025-01-15",
  timezone: "Asia/Kolkata",
  settings: DEFAULT_SETTINGS,
  recentActivityIds: [],
  activeRoutinePrescriptionIds: [],
  isPhysioRoutineActive: false,
};

describe("Planning Pipeline Integration", () => {
  describe("good weather — outdoor activities pass", () => {
    it("morning walk is a passing candidate in good weather", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      const walkPassing = result.candidates.some(
        (c) => c.activityName === "Morning Walk" && c.isPassing,
      );
      expect(walkPassing).toBe(true);
    });

    it("produces a primary, backup, and minimum-win item in good weather", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      expect(result.selected.primaryCandidateId).toBeTruthy();
      expect(result.selected.backupCandidateId).toBeTruthy();
      expect(result.selected.minimumWinCandidateId).toBeTruthy();
    });
  });

  describe("blocked weather — outdoor activities rejected", () => {
    it("morning walk is rejected when weather is OUTDOOR_BLOCKED", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_BLOCKED"),
        llm: makeLLM(),
      });
      const walkRejected = result.rejected.some(
        (c) =>
          c.activityName === "Morning Walk" &&
          c.rejectionReasons.some((r) => r.includes("weather")),
      );
      expect(walkRejected).toBe(true);
    });

    it("fallback to indoor activity when all outdoor options are blocked", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_BLOCKED"),
        llm: makeLLM(),
      });
      const selectedId = result.selected.primaryCandidateId;
      const selected = result.candidates.find((c) => c.id === selectedId);
      expect(selected?.activityName).toBe("Desk Stretches");
    });

    it("high rain probability rejects outdoor activity", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD", { rainProbabilityPercent: 80 }),
        llm: makeLLM(),
      });
      const walkRejected = result.rejected.some(
        (c) =>
          c.activityName === "Morning Walk" &&
          c.rejectionReasons.some((r) => r.toLowerCase().includes("rain")),
      );
      expect(walkRejected).toBe(true);
    });
  });

  describe("location changes affect eligible activities", () => {
    it("swimming is rejected at home (no pool)", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: [...OUTDOOR_ACTIVITIES, SWIM_ACTIVITY],
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      const swimRejected = result.rejected.some(
        (c) =>
          c.activityName === "Swimming" &&
          c.rejectionReasons.some((r) => r.includes("pool")),
      );
      expect(swimRejected).toBe(true);
    });

    it("swimming is a passing candidate at hotel (has pool)", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: [...OUTDOOR_ACTIVITIES, SWIM_ACTIVITY],
        location: HOTEL_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      const swimPassing = result.candidates.some(
        (c) => c.activityName === "Swimming" && c.isPassing,
      );
      expect(swimPassing).toBe(true);
    });

    it("indoor walk (hotel/airport/coworking only) is rejected at home", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: [...OUTDOOR_ACTIVITIES, INDOOR_WALK],
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      const rejected = result.rejected.some(
        (c) =>
          c.activityName === "Indoor Walk" &&
          c.rejectionReasons.some((r) => r.includes("home")),
      );
      expect(rejected).toBe(true);
    });

    it("indoor walk is a passing candidate at hotel", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: [...OUTDOOR_ACTIVITIES, INDOOR_WALK],
        location: HOTEL_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      const passing = result.candidates.some(
        (c) => c.activityName === "Indoor Walk" && c.isPassing,
      );
      expect(passing).toBe(true);
    });
  });

  describe("physio constraints — never scheduled unless approved and active", () => {
    it("physio with isPhysioApproved=false is always in rejected list", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: [...OUTDOOR_ACTIVITIES, PHYSIO_UNAPPROVED],
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
        isPhysioRoutineActive: false,
      });
      const physioRejected = result.rejected.some(
        (c) =>
          c.activityName === "Physio Routine" &&
          c.rejectionReasons.some((r) => r.toLowerCase().includes("approved")),
      );
      expect(physioRejected).toBe(true);
    });

    it("physio is rejected even when isPhysioRoutineActive=true but not approved", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: [...OUTDOOR_ACTIVITIES, PHYSIO_UNAPPROVED],
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
        isPhysioRoutineActive: true,
      });
      const physioRejected = result.rejected.some(
        (c) => c.activityName === "Physio Routine",
      );
      expect(physioRejected).toBe(true);
    });

    it("physio is never selected as primary when not approved", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: [...OUTDOOR_ACTIVITIES, PHYSIO_UNAPPROVED],
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
        isPhysioRoutineActive: false,
      });
      const selectedId = result.selected.primaryCandidateId;
      const selectedActivity = result.candidates.find(
        (c) => c.id === selectedId,
      )?.activityName;
      expect(selectedActivity).not.toBe("Physio Routine");
    });

    it("approved physio with active routine IS a passing candidate", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: [...OUTDOOR_ACTIVITIES, PHYSIO_APPROVED],
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
        isPhysioRoutineActive: true,
      });
      const physioPassing = result.candidates.some(
        (c) => c.activityName === "Physio Routine" && c.isPassing,
      );
      expect(physioPassing).toBe(true);
    });
  });

  describe("calendar availability changes the selected time window", () => {
    it("busy morning shifts candidate window away from busy period", async () => {
      // Block IST 7:00–14:00, forcing all candidates into the afternoon
      const busyResult = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar([[7, 14]]),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      const freeResult = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });

      const busyPrimary = busyResult.candidates.find(
        (c) => c.id === busyResult.selected.primaryCandidateId,
      );
      const freePrimary = freeResult.candidates.find(
        (c) => c.id === freeResult.selected.primaryCandidateId,
      );

      expect(busyPrimary?.windowStart.getTime()).toBeGreaterThan(
        freePrimary!.windowStart.getTime(),
      );
    });

    it("all-day event does not reduce candidate count (all-day events ignored)", async () => {
      const allDayCalendar: CalendarAdapter = {
        connected: false,
        mock: true,
        listEvents: async (_userId, start) => [
          {
            id: "all-day-event",
            calendarId: "primary",
            startAt: start,
            endAt: new Date(start.getTime() + 24 * 3600000),
            isAllDay: true,
            isCancelled: false,
            isRemote: false,
            isInternal: false,
            isHighStakes: false,
            walkingCallEligible: false,
          },
        ],
        createEvent: async () => ({ eventId: "mock-created" }),
        deleteEvent: async () => undefined,
        healthCheck: async () => ({ ok: true }),
      };
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: allDayCalendar,
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      expect(result.candidates.length).toBeGreaterThan(0);
    });
  });

  describe("result structure and invariants", () => {
    it("selected primaryCandidateId references a passing candidate", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      const primary = result.candidates.find(
        (c) => c.id === result.selected.primaryCandidateId,
      );
      expect(primary).toBeDefined();
      expect(primary?.isPassing).toBe(true);
    });

    it("rejected candidates have rejection reasons", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: [...OUTDOOR_ACTIVITIES, SWIM_ACTIVITY],
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      for (const c of result.rejected) {
        expect(c.rejectionReasons.length).toBeGreaterThan(0);
        expect(c.isPassing).toBe(false);
      }
    });

    it("passing candidates have numeric scores", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      for (const c of result.candidates) {
        expect(typeof c.score).toBe("number");
        expect(c.score).toBeGreaterThanOrEqual(0);
        expect(c.score).toBeLessThanOrEqual(100);
      }
    });

    it("mode is reported as llm_assisted or deterministic_fallback", async () => {
      const result = await createDailyPlan({
        ...BASE_INPUT,
        activities: OUTDOOR_ACTIVITIES,
        location: HOME_LOCATION,
        calendar: makeCalendar(),
        weather: makeWeather("OUTDOOR_GOOD"),
        llm: makeLLM(),
      });
      expect(["llm_assisted", "deterministic_fallback"]).toContain(result.mode);
    });
  });
});
