import { describe, it, expect } from "vitest";
import { applyHardConstraints } from "../../src/planner/hard-constraints";
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

const BLOCKED_WEATHER: WeatherSnapshot = {
  condition: "OUTDOOR_BLOCKED",
  temperatureC: 38,
  rainProbabilityPercent: 80,
  windSpeedKph: 50,
  summary: "Stormy",
  fetchedAt: new Date().toISOString(),
};

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "c1",
    activityTemplateId: "a1",
    activityName: "Test",
    role: "primary",
    windowStart: new Date("2025-01-15T10:00:00Z"),
    windowEnd: new Date("2025-01-15T10:30:00Z"),
    durationMinutes: 30,
    locationId: "l1",
    locationLabel: "Test Location",
    score: 0,
    scoreBreakdown: {},
    rejectionReasons: [],
    isPassing: false,
    ...overrides,
  };
}

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

describe("applyHardConstraints", () => {
  it("outdoor activity is rejected when weather is OUTDOOR_BLOCKED", () => {
    const reasons = applyHardConstraints(makeCandidate(), {
      activity: makeActivity({ weatherMode: "outdoor" }),
      location: makeLocation(),
      weather: BLOCKED_WEATHER,
      settings: DEFAULT_SETTINGS,
      isPhysioRoutineActive: false,
      candidate: makeCandidate(),
    });
    expect(reasons.some((r) => r.includes("weather"))).toBe(true);
  });

  it("outdoor activity passes when weather is OUTDOOR_GOOD", () => {
    const reasons = applyHardConstraints(makeCandidate(), {
      activity: makeActivity({ weatherMode: "outdoor" }),
      location: makeLocation(),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      isPhysioRoutineActive: false,
      candidate: makeCandidate(),
    });
    expect(reasons.length).toBe(0);
  });

  it("outdoor activity is rejected inside an airport with indoor walking available", () => {
    const reasons = applyHardConstraints(makeCandidate(), {
      activity: makeActivity({ weatherMode: "outdoor" }),
      location: makeLocation({ locationType: "airport", hasIndoorWalk: true }),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      isPhysioRoutineActive: false,
      candidate: makeCandidate(),
    });
    expect(reasons.some((reason) => /airport/i.test(reason))).toBe(true);
  });

  it("pool activity rejected at location without pool", () => {
    const reasons = applyHardConstraints(makeCandidate(), {
      activity: makeActivity({ requiresPool: true }),
      location: makeLocation({ hasPool: false }),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      isPhysioRoutineActive: false,
      candidate: makeCandidate(),
    });
    expect(reasons.some((r) => r.includes("pool"))).toBe(true);
  });

  it("pool activity passes at location with pool", () => {
    const reasons = applyHardConstraints(makeCandidate(), {
      activity: makeActivity({ requiresPool: true }),
      location: makeLocation({ hasPool: true }),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      isPhysioRoutineActive: false,
      candidate: makeCandidate(),
    });
    expect(reasons.length).toBe(0);
  });

  it("floor physio rejected at location without floor space", () => {
    const reasons = applyHardConstraints(makeCandidate(), {
      activity: makeActivity({
        category: "physio",
        requiresFloorSpace: true,
        isPhysioApproved: true,
        minimumPrivacy: "private",
      }),
      location: makeLocation({ hasFloorSpace: false }),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      isPhysioRoutineActive: true,
      candidate: makeCandidate(),
    });
    expect(reasons.some((r) => r.includes("floor"))).toBe(true);
  });

  it("private activity rejected at public location", () => {
    const reasons = applyHardConstraints(makeCandidate(), {
      activity: makeActivity({ minimumPrivacy: "private" }),
      location: makeLocation({ publicPrivacyLevel: "public" }),
      weather: GOOD_WEATHER,
      settings: DEFAULT_SETTINGS,
      isPhysioRoutineActive: false,
      candidate: makeCandidate(),
    });
    expect(reasons.some((r) => r.includes("privacy"))).toBe(true);
  });

  describe("physio constraints", () => {
    it("physio category with isPhysioApproved=false is ALWAYS rejected, regardless of routine active state", () => {
      const reasons = applyHardConstraints(makeCandidate(), {
        activity: makeActivity({ category: "physio", isPhysioApproved: false }),
        location: makeLocation(),
        weather: GOOD_WEATHER,
        settings: DEFAULT_SETTINGS,
        isPhysioRoutineActive: true,
        candidate: makeCandidate(),
      });
      expect(reasons.some((r) => r.toLowerCase().includes("approved"))).toBe(
        true,
      );
    });

    it("physio category with isPhysioApproved=false is rejected even when routine is active", () => {
      const reasons = applyHardConstraints(makeCandidate(), {
        activity: makeActivity({ category: "physio", isPhysioApproved: false }),
        location: makeLocation(),
        weather: GOOD_WEATHER,
        settings: DEFAULT_SETTINGS,
        isPhysioRoutineActive: true,
        candidate: makeCandidate(),
      });
      expect(reasons.length).toBeGreaterThan(0);
    });

    it("physio category with isPhysioApproved=true but routine inactive is rejected", () => {
      const reasons = applyHardConstraints(makeCandidate(), {
        activity: makeActivity({ category: "physio", isPhysioApproved: true }),
        location: makeLocation(),
        weather: GOOD_WEATHER,
        settings: DEFAULT_SETTINGS,
        isPhysioRoutineActive: false,
        candidate: makeCandidate(),
      });
      expect(
        reasons.some(
          (r) =>
            r.toLowerCase().includes("active") ||
            r.toLowerCase().includes("physio"),
        ),
      ).toBe(true);
    });

    it("physio routine is rejected after its rolling frequency target is met", () => {
      const reasons = applyHardConstraints(makeCandidate(), {
        activity: makeActivity({ category: "physio", isPhysioApproved: true }),
        location: makeLocation(),
        weather: GOOD_WEATHER,
        settings: DEFAULT_SETTINGS,
        isPhysioRoutineActive: true,
        routineRule: { minimumGapHours: 24, due: false },
        candidate: makeCandidate(),
      });
      expect(
        reasons.some((reason) => /target is already met/i.test(reason)),
      ).toBe(true);
    });

    it("physio category with isPhysioApproved=true and routine active passes", () => {
      const reasons = applyHardConstraints(makeCandidate(), {
        activity: makeActivity({ category: "physio", isPhysioApproved: true }),
        location: makeLocation(),
        weather: GOOD_WEATHER,
        settings: DEFAULT_SETTINGS,
        isPhysioRoutineActive: true,
        candidate: makeCandidate(),
      });
      expect(reasons.length).toBe(0);
    });

    it("non-physio category is never rejected for physio reasons", () => {
      const reasons = applyHardConstraints(makeCandidate(), {
        activity: makeActivity({ category: "walk", isPhysioApproved: false }),
        location: makeLocation(),
        weather: GOOD_WEATHER,
        settings: DEFAULT_SETTINGS,
        isPhysioRoutineActive: false,
        candidate: makeCandidate(),
      });
      expect(reasons.every((r) => !r.toLowerCase().includes("physio"))).toBe(
        true,
      );
    });

    it("minimum gap physio check fails when gap is too short (approved + active)", () => {
      const lastPhysioAt = new Date("2025-01-15T09:00:00Z");
      const candidateStart = new Date("2025-01-15T10:00:00Z");
      const reasons = applyHardConstraints(
        makeCandidate({ windowStart: candidateStart }),
        {
          activity: makeActivity({
            category: "physio",
            isPhysioApproved: true,
          }),
          location: makeLocation(),
          weather: GOOD_WEATHER,
          settings: DEFAULT_SETTINGS,
          isPhysioRoutineActive: true,
          lastCompletedAt: lastPhysioAt,
          candidate: makeCandidate({ windowStart: candidateStart }),
        },
      );
      expect(
        reasons.some((r) => r.includes("gap") || r.includes("Minimum")),
      ).toBe(true);
    });
  });

  it("high rain probability blocks outdoor activity", () => {
    const rainyWeather: WeatherSnapshot = {
      ...GOOD_WEATHER,
      condition: "OUTDOOR_GOOD",
      rainProbabilityPercent: 75,
    };
    const reasons = applyHardConstraints(makeCandidate(), {
      activity: makeActivity({ weatherMode: "outdoor" }),
      location: makeLocation(),
      weather: rainyWeather,
      settings: DEFAULT_SETTINGS,
      isPhysioRoutineActive: false,
      candidate: makeCandidate(),
    });
    expect(reasons.some((r) => r.includes("rain") || r.includes("Rain"))).toBe(
      true,
    );
  });
});
