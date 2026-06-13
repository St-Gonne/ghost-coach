export type WeatherCondition =
  | "OUTDOOR_GOOD"
  | "OUTDOOR_CAUTION"
  | "OUTDOOR_BLOCKED"
  | "INDOOR_ONLY";

export type LocationType =
  | "home"
  | "hotel"
  | "airport"
  | "mall"
  | "coworking"
  | "coffee_shop"
  | "gym"
  | "outdoor_park"
  | "friend_house"
  | "other";

export type PrivacyLevel = "private" | "semi_public" | "public";

export type ActivityCategory =
  | "walk"
  | "run"
  | "swim"
  | "strength"
  | "yoga"
  | "physio"
  | "stretch"
  | "cycling"
  | "sport"
  | "stairs"
  | "recovery"
  | "other";

export type ActivityIntensity = "low" | "moderate" | "high";

export type PlanItemState =
  | "proposed"
  | "calendar_blocked"
  | "pre_reminder_sent"
  | "start_prompt_sent"
  | "started"
  | "done"
  | "partial"
  | "skipped"
  | "backup_proposed"
  | "backup_done"
  | "backup_partial"
  | "backup_skipped"
  | "minimum_win_done"
  | "rest_day";

export type PlanItemRole = "primary" | "backup" | "minimum_win";

export type PlannerMode = "llm_assisted" | "deterministic_fallback";

export type NudgeType =
  | "morning_brief"
  | "pre_reminder"
  | "start_prompt"
  | "follow_up"
  | "evening_summary";

export type JobType =
  | "morning_brief"
  | "pre_reminder"
  | "start_prompt"
  | "follow_up"
  | "evening_summary"
  | "weekly_review";

export type JobStatus = "pending" | "running" | "done" | "failed" | "cancelled";

export interface FreeWindow {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface WeatherSnapshot {
  condition: WeatherCondition;
  temperatureC: number;
  rainProbabilityPercent: number;
  windSpeedKph: number;
  summary: string;
  fetchedAt: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  startAt: Date;
  endAt: Date;
  titleRedacted?: string;
  locationText?: string;
  isAllDay: boolean;
  isCancelled: boolean;
  isRemote: boolean;
  isInternal: boolean;
  isHighStakes: boolean;
  walkingCallEligible: boolean;
}

export interface ActivityFeatures {
  id: string;
  name: string;
  category: ActivityCategory;
  goalTags: string[];
  minimumMinutes: number;
  preferredMinutes: number;
  maximumMinutes: number;
  intensity: ActivityIntensity;
  requiresFloorSpace: boolean;
  requiresPool: boolean;
  requiresStairs: boolean;
  requiresShower: boolean;
  requiresEquipment: string[];
  minimumPrivacy: PrivacyLevel;
  publicSuitability: string;
  weatherMode: "outdoor" | "indoor" | "either";
  allowedLocationTypes: LocationType[];
  preferenceScore: number;
  isPhysioApproved: boolean;
  active: boolean;
}

export interface LocationFeatures {
  id: string;
  label: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone: string;
  locationType: LocationType;
  hasFloorSpace: boolean;
  hasPool: boolean;
  hasStairs: boolean;
  hasIndoorWalk: boolean;
  hasShower: boolean;
  publicPrivacyLevel: PrivacyLevel;
  typicalTravelOverheadMinutes: number;
}

export interface Candidate {
  id: string;
  activityTemplateId: string;
  activityName: string;
  role: PlanItemRole;
  windowStart: Date;
  windowEnd: Date;
  durationMinutes: number;
  locationId: string;
  locationLabel: string;
  score: number;
  scoreBreakdown: Record<string, number>;
  rejectionReasons: string[];
  isPassing: boolean;
}

export interface SelectedPlan {
  primaryCandidateId: string;
  backupCandidateId: string;
  minimumWinCandidateId: string;
  reasoningSummary: string;
  caution: string;
}

export interface DailyContext {
  userId: string;
  localDate: string;
  timezone: string;
  location: LocationFeatures;
  calendarEvents: CalendarEvent[];
  weather: WeatherSnapshot;
  recentActivityIds: string[];
  activeRoutinePrescriptionIds: string[];
}

export interface CoachingSettings {
  dayStartLocalTime: string;
  dayEndLocalTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  minimumFreeWindowMinutes: number;
  transitionBufferMinutes: number;
  coachingIntensity: number;
  maxNudgesPerDay: number;
  weatherHeatThresholdC: number;
  weatherRainProbabilityLimit: number;
  weatherWindLimitKph: number;
  targetActiveDaysPerWeek: number;
  preferCompletionOverProgression: boolean;
}
