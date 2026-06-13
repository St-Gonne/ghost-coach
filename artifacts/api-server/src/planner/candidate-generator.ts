import { v4 as uuidv4 } from "uuid";
import type {
  Candidate,
  FreeWindow,
  ActivityFeatures,
  LocationFeatures,
  PlanItemRole,
} from "../domain/types";
import { addMins } from "../domain/time";

const SLOT_INTERVAL_MINUTES = 30;
const MAX_STARTS_PER_WINDOW = 32;

function candidateStarts(window: FreeWindow, durationMinutes: number): Date[] {
  const latestStartMs = window.end.getTime() - durationMinutes * 60_000;
  if (latestStartMs < window.start.getTime()) return [];

  const starts: Date[] = [];
  let cursor = new Date(window.start);

  while (
    cursor.getTime() <= latestStartMs &&
    starts.length < MAX_STARTS_PER_WINDOW
  ) {
    starts.push(cursor);
    cursor = addMins(cursor, SLOT_INTERVAL_MINUTES);
  }

  const latestStart = new Date(latestStartMs);
  if (
    starts.length < MAX_STARTS_PER_WINDOW &&
    !starts.some((start) => start.getTime() === latestStart.getTime())
  ) {
    starts.push(latestStart);
  }

  return starts;
}

function pushCandidate(params: {
  candidates: Candidate[];
  activity: ActivityFeatures;
  location: LocationFeatures;
  start: Date;
  durationMinutes: number;
  role: PlanItemRole;
}) {
  const { candidates, activity, location, start, durationMinutes, role } =
    params;
  candidates.push({
    id: uuidv4(),
    activityTemplateId: activity.id,
    activityName: activity.name,
    role,
    windowStart: start,
    windowEnd: addMins(start, durationMinutes),
    durationMinutes,
    locationId: location.id,
    locationLabel: location.label,
    score: 0,
    scoreBreakdown: {},
    rejectionReasons: [],
    isPassing: false,
  });
}

export function generateCandidates(params: {
  activities: ActivityFeatures[];
  windows: FreeWindow[];
  location: LocationFeatures;
}): Candidate[] {
  const { activities, windows, location } = params;
  const candidates: Candidate[] = [];

  for (const activity of activities) {
    if (!activity.active) continue;

    for (const window of windows) {
      if (window.durationMinutes < activity.minimumMinutes) continue;

      const fullDuration = Math.min(
        activity.preferredMinutes,
        window.durationMinutes,
      );
      for (const start of candidateStarts(window, fullDuration)) {
        pushCandidate({
          candidates,
          activity,
          location,
          start,
          durationMinutes: fullDuration,
          role: "primary",
        });
      }

      const minimumDuration = activity.minimumMinutes;
      if (minimumDuration < fullDuration) {
        for (const start of candidateStarts(window, minimumDuration)) {
          pushCandidate({
            candidates,
            activity,
            location,
            start,
            durationMinutes: minimumDuration,
            role: "minimum_win",
          });
        }
      }
    }
  }

  return candidates;
}
