import type {
  Candidate,
  ActivityFeatures,
  LocationFeatures,
  WeatherSnapshot,
  CoachingSettings,
} from "../domain/types";

export interface HardConstraintContext {
  activity: ActivityFeatures;
  location: LocationFeatures;
  weather: WeatherSnapshot;
  settings: CoachingSettings;
  lastCompletedAt?: Date | null;
  routineRule?: { minimumGapHours: number; due: boolean };
  isPhysioRoutineActive: boolean;
  candidate: Candidate;
}

export function applyHardConstraints(
  candidate: Candidate,
  ctx: HardConstraintContext,
): string[] {
  const { activity, location, weather, settings } = ctx;
  const reasons: string[] = [];

  if (
    activity.weatherMode === "outdoor" &&
    (weather.condition === "OUTDOOR_BLOCKED" ||
      weather.condition === "INDOOR_ONLY")
  ) {
    reasons.push(
      `Outdoor activity blocked by weather/environment (${weather.condition})`,
    );
  }

  if (
    activity.weatherMode === "outdoor" &&
    location.locationType === "airport"
  ) {
    reasons.push(
      "Outdoor activity is not practical inside an airport; use an indoor walk instead",
    );
  }

  if (
    activity.weatherMode === "outdoor" &&
    weather.condition === "OUTDOOR_CAUTION" &&
    weather.temperatureC >= settings.weatherHeatThresholdC
  ) {
    reasons.push(
      `Too hot for outdoor activity (${weather.temperatureC}°C >= ${settings.weatherHeatThresholdC}°C)`,
    );
  }

  if (
    activity.weatherMode === "outdoor" &&
    weather.rainProbabilityPercent > settings.weatherRainProbabilityLimit
  ) {
    reasons.push(
      `Rain probability too high (${weather.rainProbabilityPercent}% > ${settings.weatherRainProbabilityLimit}%)`,
    );
  }

  if (
    activity.weatherMode === "outdoor" &&
    weather.windSpeedKph > settings.weatherWindLimitKph
  ) {
    reasons.push(
      `Wind too strong (${weather.windSpeedKph} kph > ${settings.weatherWindLimitKph} kph)`,
    );
  }

  if (activity.requiresFloorSpace && !location.hasFloorSpace) {
    reasons.push(
      `Activity requires floor space; not available at ${location.label}`,
    );
  }

  if (activity.requiresPool && !location.hasPool) {
    reasons.push(
      `Activity requires a pool; not available at ${location.label}`,
    );
  }

  if (activity.requiresStairs && !location.hasStairs) {
    reasons.push(
      `Activity requires stairs; not available at ${location.label}`,
    );
  }

  if (activity.requiresShower && !location.hasShower) {
    reasons.push(
      `Activity requires a shower; not available at ${location.label}`,
    );
  }

  const privacyRank: Record<string, number> = {
    public: 0,
    semi_public: 1,
    private: 2,
  };
  const activityMin = privacyRank[activity.minimumPrivacy] ?? 0;
  const locationPrivacy = privacyRank[location.publicPrivacyLevel] ?? 0;
  if (locationPrivacy < activityMin) {
    reasons.push(
      `Activity requires ${activity.minimumPrivacy} privacy; location is ${location.publicPrivacyLevel}`,
    );
  }

  if (activity.category === "physio") {
    if (!activity.isPhysioApproved) {
      reasons.push(
        "Physio routine has not been approved — enter exercise instructions and mark as approved before scheduling",
      );
    } else if (!ctx.isPhysioRoutineActive) {
      reasons.push("Physio routine is not currently active");
    } else if (ctx.routineRule && !ctx.routineRule.due) {
      reasons.push(
        "Physio routine target is already met for the current 7-day window",
      );
    } else if (ctx.lastCompletedAt) {
      const gapHours =
        (candidate.windowStart.getTime() - ctx.lastCompletedAt.getTime()) /
        3600000;
      const minimumGapHours = ctx.routineRule?.minimumGapHours ?? 24;
      if (gapHours < minimumGapHours) {
        reasons.push(
          `Minimum gap since last physio session not met (${gapHours.toFixed(1)}h < ${minimumGapHours}h)`,
        );
      }
    }
  }

  if (
    activity.allowedLocationTypes.length > 0 &&
    !activity.allowedLocationTypes.includes(location.locationType)
  ) {
    reasons.push(
      `Activity not allowed at location type ${location.locationType}`,
    );
  }

  return reasons;
}
