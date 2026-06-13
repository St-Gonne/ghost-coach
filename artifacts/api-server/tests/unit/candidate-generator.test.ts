import { describe, expect, it } from "vitest";
import { generateCandidates } from "../../src/planner/candidate-generator";
import type {
  ActivityFeatures,
  FreeWindow,
  LocationFeatures,
} from "../../src/domain/types";

const activity: ActivityFeatures = {
  id: "walk",
  name: "Walk",
  category: "walk",
  goalTags: ["movement"],
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

const location: LocationFeatures = {
  id: "home",
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
};

describe("candidate generator", () => {
  it("creates multiple start-time alternatives inside a long free window", () => {
    const start = new Date("2026-06-12T01:30:00.000Z");
    const window: FreeWindow = {
      start,
      end: new Date(start.getTime() + 120 * 60_000),
      durationMinutes: 120,
    };

    const candidates = generateCandidates({
      activities: [activity],
      windows: [window],
      location,
    });
    const fullStarts = candidates
      .filter((item) => item.role === "primary")
      .map((item) => item.windowStart.getTime());

    expect(new Set(fullStarts).size).toBeGreaterThan(1);
    expect(candidates.some((item) => item.role === "minimum_win")).toBe(true);
  });
});
