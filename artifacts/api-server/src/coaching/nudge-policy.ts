import type { NudgeType } from "../domain/types";
import { isInQuietHours } from "../domain/time";

const INTENSITY_NUDGE_TYPES: Record<number, NudgeType[]> = {
  1: ["morning_brief"],
  2: ["morning_brief", "pre_reminder"],
  3: ["morning_brief", "pre_reminder", "start_prompt"],
  4: ["morning_brief", "pre_reminder", "start_prompt", "follow_up"],
  5: ["morning_brief", "pre_reminder", "start_prompt", "follow_up", "evening_summary"],
};

export function allowedNudgeTypes(intensity: number): NudgeType[] {
  return INTENSITY_NUDGE_TYPES[Math.min(5, Math.max(1, intensity))] ?? ["morning_brief"];
}

export function canSendNudge(params: {
  nudgeType: NudgeType;
  intensity: number;
  nudgesSentToday: NudgeType[];
  maxNudgesPerDay: number;
  now: Date;
  quietHoursStart: string;
  quietHoursEnd: string;
  localDate: string;
  timezone: string;
}): { allowed: boolean; reason?: string } {
  const {
    nudgeType,
    intensity,
    nudgesSentToday,
    maxNudgesPerDay,
    now,
    quietHoursStart,
    quietHoursEnd,
    localDate,
    timezone,
  } = params;

  const allowed = allowedNudgeTypes(intensity);
  if (!allowed.includes(nudgeType)) {
    return {
      allowed: false,
      reason: `Nudge type ${nudgeType} not allowed at intensity ${intensity}`,
    };
  }

  if (nudgesSentToday.length >= maxNudgesPerDay) {
    return {
      allowed: false,
      reason: `Daily nudge cap reached (${maxNudgesPerDay})`,
    };
  }

  const inQuiet = isInQuietHours(now, quietHoursStart, quietHoursEnd, localDate, timezone);
  if (inQuiet) {
    return {
      allowed: false,
      reason: `In quiet hours (${quietHoursStart}–${quietHoursEnd})`,
    };
  }

  if (nudgesSentToday.includes(nudgeType) && nudgeType !== "follow_up") {
    return {
      allowed: false,
      reason: `Nudge type ${nudgeType} already sent today`,
    };
  }

  return { allowed: true };
}
