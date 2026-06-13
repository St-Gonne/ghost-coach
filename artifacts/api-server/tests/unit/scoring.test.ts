import { describe, it, expect } from "vitest";
import { scoreCandidate } from "../../src/planner/scoring";
import type {
  Candidate,
  ActivityFeatures,
  LocationFeatures,
  WeatherSnapshot,
  CoachingSettings,
} from "../../src/domain/types";

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

const GOOD_WEATHER: WeatherSnapshot = {
  condition: "OUTDOOR_GOOD",
  temperatureC: 27,
  rainProbabilityPercent: 5,
  windSpeedKph: 12,
  summary: "Clear",
  fetchedAt: new Date().toISOString(),
};

function makeActivity(
  overrides: Partial<ActivityFeatures> = {},
): ActivityFeatures {
  return {
    id: "a1",
    name: "Walk",
    category: "walk",
    goalTags: [],
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
    preferenceScore: 70,
    isPhysioApproved: false,
    active: true,
    ...overrides,
  };
}

function makeLocation(
  overrides: Partial<LocationFeatures> = {},
): LocationFeatures {
  return {
    id: "l1",
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
    ...overrides,
  };
}

function makeCandidate(
  windowHour: number,
  overrides: Partial<Candidate> = {},
): Candidate {
  const start = new Date(
    `2025-01-15T${String(windowHour).padStart(2, "0")}:00:00Z`,
  );
  const end = new Date(start.getTime() + 30 * 60000);
  return {
    id: "c1",
    activityTemplateId: "a1",
    activityName: "Walk",
    role: "primary",
    windowStart: start,
    windowEnd: end,
    durationMinutes: 30,
    locationId: "l1",
    locationLabel: "Home",
    score: 0,
    scoreBreakdown: {},
    rejectionReasons: [],
    isPassing: true,
    ...overrides,
  };
}

describe("scoreCandidate", () => {
  it("morning slot scores higher than evening slot", () => {
    const morningCtx = {
      activity: makeActivity(),
      location: makeLocation(),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      recentActivityIds: [],
      isPhysioRoutineActive: false,
      activeRoutinePrescriptionIds: [],
      candidate: makeCandidate(7),
    };
    const eveningCtx = {
      ...morningCtx,
      candidate: makeCandidate(20),
    };
    const { score: morningScore } = scoreCandidate(morningCtx);
    const { score: eveningScore } = scoreCandidate(eveningCtx);
    expect(morningScore).toBeGreaterThan(eveningScore);
  });

  it("scores timing in the user's timezone rather than server UTC", () => {
    const instantAtSevenAmIst = new Date("2026-06-12T01:30:00.000Z");
    const base = {
      activity: makeActivity(),
      location: makeLocation(),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      recentActivityIds: [],
      isPhysioRoutineActive: false,
      activeRoutinePrescriptionIds: [],
      candidate: makeCandidate(7, { windowStart: instantAtSevenAmIst }),
    };

    const ist = scoreCandidate({ ...base, timezone: "Asia/Kolkata" });
    const utc = scoreCandidate({ ...base, timezone: "UTC" });

    expect(ist.breakdown["timing"]).toBe(26);
    expect(ist.score).toBeGreaterThan(utc.score);
  });

  it("physio due prescription gives bonus", () => {
    const withPhysio = {
      activity: makeActivity({ id: "physio-1", isPhysioApproved: true }),
      location: makeLocation(),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      recentActivityIds: [],
      isPhysioRoutineActive: true,
      activeRoutinePrescriptionIds: ["physio-1"],
      candidate: makeCandidate(9, { activityTemplateId: "physio-1" }),
    };
    const withoutPhysio = {
      ...withPhysio,
      isPhysioRoutineActive: false,
      activeRoutinePrescriptionIds: [],
    };
    const { score: physioScore } = scoreCandidate(withPhysio);
    const { score: regularScore } = scoreCandidate(withoutPhysio);
    expect(physioScore).toBeGreaterThan(regularScore);
  });

  it("boredom penalty applied when same activity was done 3+ recent days", () => {
    const recentIds = ["a1", "a1", "a1"];
    const boredCtx = {
      activity: makeActivity(),
      location: makeLocation(),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      recentActivityIds: recentIds,
      isPhysioRoutineActive: false,
      activeRoutinePrescriptionIds: [],
      candidate: makeCandidate(9),
    };
    const freshCtx = { ...boredCtx, recentActivityIds: [] };

    const { score: boredScore, breakdown: boredBreakdown } =
      scoreCandidate(boredCtx);
    const { score: freshScore } = scoreCandidate(freshCtx);
    expect(boredBreakdown["boredom_penalty"]).toBeLessThan(0);
    expect(boredScore).toBeLessThan(freshScore);
  });

  it("travel friction penalty applied for high overhead location", () => {
    const highOverheadCtx = {
      activity: makeActivity(),
      location: makeLocation({ typicalTravelOverheadMinutes: 25 }),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      recentActivityIds: [],
      isPhysioRoutineActive: false,
      activeRoutinePrescriptionIds: [],
      candidate: makeCandidate(9),
    };
    const noOverheadCtx = {
      ...highOverheadCtx,
      location: makeLocation({ typicalTravelOverheadMinutes: 0 }),
    };
    const { breakdown: highBreakdown } = scoreCandidate(highOverheadCtx);
    const { breakdown: noBreakdown } = scoreCandidate(noOverheadCtx);
    expect(highBreakdown["travel_friction"]).toBeLessThan(
      noBreakdown["travel_friction"]!,
    );
  });

  it("score is between 0 and 100", () => {
    const ctx = {
      activity: makeActivity({ preferenceScore: 100 }),
      location: makeLocation(),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      recentActivityIds: [],
      isPhysioRoutineActive: false,
      activeRoutinePrescriptionIds: [],
      candidate: makeCandidate(7),
    };
    const { score } = scoreCandidate(ctx);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("duration fit score is higher when candidate duration matches preferred", () => {
    const perfectFit = {
      activity: makeActivity({ preferredMinutes: 30 }),
      location: makeLocation(),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      recentActivityIds: [],
      isPhysioRoutineActive: false,
      activeRoutinePrescriptionIds: [],
      candidate: makeCandidate(9, { durationMinutes: 30 }),
    };
    const shortFit = {
      ...perfectFit,
      candidate: makeCandidate(9, { durationMinutes: 10 }),
    };
    const { breakdown: perfectBreakdown } = scoreCandidate(perfectFit);
    const { breakdown: shortBreakdown } = scoreCandidate(shortFit);
    expect(perfectBreakdown["duration_fit"]).toBeGreaterThan(
      shortBreakdown["duration_fit"]!,
    );
  });
});
