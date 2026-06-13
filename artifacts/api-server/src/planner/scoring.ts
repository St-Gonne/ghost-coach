import { toZonedTime } from "date-fns-tz";
import type {
  Candidate,
  ActivityFeatures,
  LocationFeatures,
  WeatherSnapshot,
  CoachingSettings,
} from "../domain/types";

export interface ScoringContext {
  activity: ActivityFeatures;
  location: LocationFeatures;
  weather: WeatherSnapshot;
  settings: CoachingSettings;
  timezone?: string;
  recentActivityIds: string[];
  isPhysioRoutineActive: boolean;
  activeRoutinePrescriptionIds: string[];
  candidate: Candidate;
}

const HOUR_COMPLETION_PRIORS: Record<number, number> = {
  6: 0.9,
  7: 0.85,
  8: 0.8,
  9: 0.75,
  10: 0.7,
  11: 0.65,
  12: 0.5,
  13: 0.45,
  14: 0.55,
  15: 0.5,
  16: 0.45,
  17: 0.4,
  18: 0.35,
  19: 0.3,
  20: 0.25,
};

function completionPrior(date: Date, timezone: string): number {
  const localHour = toZonedTime(date, timezone).getHours();
  return HOUR_COMPLETION_PRIORS[localHour] ?? 0.2;
}

export function scoreCandidate(ctx: ScoringContext): {
  score: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  const { activity, location, candidate, settings } = ctx;

  const timing =
    completionPrior(candidate.windowStart, ctx.timezone ?? "UTC") * 30;
  breakdown["timing"] = Math.round(timing);

  const preference = (activity.preferenceScore / 100) * 25;
  breakdown["preference"] = Math.round(preference);

  let physioBonus = 0;
  if (
    activity.isPhysioApproved &&
    ctx.isPhysioRoutineActive &&
    ctx.activeRoutinePrescriptionIds.includes(activity.id)
  ) {
    physioBonus = 20;
  }
  breakdown["physio_due"] = physioBonus;

  const countRecent = ctx.recentActivityIds.filter(
    (id) => id === activity.id,
  ).length;
  let boredPenalty = 0;
  if (countRecent >= 3) {
    boredPenalty = -15;
  } else if (countRecent >= 2) {
    boredPenalty = -7;
  }
  breakdown["boredom_penalty"] = boredPenalty;

  const overhead = location.typicalTravelOverheadMinutes;
  const frictionPenalty = overhead > 20 ? -10 : overhead > 10 ? -5 : 0;
  breakdown["travel_friction"] = frictionPenalty;

  const ratio = candidate.durationMinutes / activity.preferredMinutes;
  const durationScore = ratio >= 0.9 ? 10 : ratio >= 0.6 ? 5 : 0;
  breakdown["duration_fit"] = durationScore;

  let weatherBonus = 0;
  if (
    activity.weatherMode === "outdoor" &&
    ctx.weather.condition === "OUTDOOR_GOOD"
  ) {
    weatherBonus = 5;
  } else if (
    activity.weatherMode !== "outdoor" &&
    (ctx.weather.condition === "OUTDOOR_BLOCKED" ||
      ctx.weather.condition === "INDOOR_ONLY")
  ) {
    weatherBonus = 5;
  }
  breakdown["weather_fit"] = weatherBonus;

  let locationFit = 0;
  if (activity.allowedLocationTypes.includes(location.locationType)) {
    locationFit = 10;
  } else if (
    location.hasIndoorWalk &&
    activity.category === "walk" &&
    activity.weatherMode !== "outdoor"
  ) {
    locationFit = 8;
  } else if (activity.requiresFloorSpace && location.hasFloorSpace) {
    locationFit = 3;
  }
  breakdown["location_fit"] = locationFit;

  const rawScore = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const score = Math.min(100, Math.max(0, rawScore));

  return { score, breakdown };
}
