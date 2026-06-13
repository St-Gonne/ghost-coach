import type { CalendarEvent, FreeWindow, CoachingSettings } from "../domain/types";
import { localTimeStringToUtc, minutesBetween } from "../domain/time";

const IN_PERSON_BUFFER_MINUTES = 15;
const REMOTE_BUFFER_MINUTES = 5;

export function generateFreeWindows(params: {
  calendarEvents: CalendarEvent[];
  localDate: string;
  timezone: string;
  settings: CoachingSettings;
}): FreeWindow[] {
  const { calendarEvents, localDate, timezone, settings } = params;

  const dayStart = localTimeStringToUtc(localDate, settings.dayStartLocalTime, timezone);
  const dayEnd = localTimeStringToUtc(localDate, settings.dayEndLocalTime, timezone);

  const quietStart = localTimeStringToUtc(localDate, settings.quietHoursStart, timezone);
  let quietEnd = localTimeStringToUtc(localDate, settings.quietHoursEnd, timezone);
  if (quietEnd <= quietStart) {
    quietEnd = new Date(quietEnd.getTime() + 24 * 60 * 60000);
  }

  const blocking = calendarEvents
    .filter((e) => !e.isCancelled && !e.isAllDay)
    .map((e) => {
      const buffer = e.isRemote ? REMOTE_BUFFER_MINUTES : IN_PERSON_BUFFER_MINUTES;
      return {
        start: new Date(e.startAt.getTime() - buffer * 60000),
        end: new Date(e.endAt.getTime() + buffer * 60000),
      };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const blockedIntervals = [...blocking];
  if (quietStart < dayEnd && quietEnd > dayStart) {
    blockedIntervals.push({ start: quietStart, end: quietEnd });
  }

  blockedIntervals.sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Array<{ start: Date; end: Date }> = [];
  for (const interval of blockedIntervals) {
    if (merged.length === 0) {
      merged.push({ ...interval });
    } else {
      const last = merged[merged.length - 1]!;
      if (interval.start <= last.end) {
        last.end = new Date(Math.max(last.end.getTime(), interval.end.getTime()));
      } else {
        merged.push({ ...interval });
      }
    }
  }

  const windows: FreeWindow[] = [];
  let cursor = dayStart;

  for (const block of merged) {
    if (block.start > cursor) {
      const effectiveStart = cursor;
      const effectiveEnd = block.start < dayEnd ? block.start : dayEnd;
      const durationMinutes = minutesBetween(effectiveStart, effectiveEnd);
      if (durationMinutes >= settings.minimumFreeWindowMinutes) {
        windows.push({ start: effectiveStart, end: effectiveEnd, durationMinutes });
      }
    }
    cursor = block.end > cursor ? block.end : cursor;
  }

  if (cursor < dayEnd) {
    const durationMinutes = minutesBetween(cursor, dayEnd);
    if (durationMinutes >= settings.minimumFreeWindowMinutes) {
      windows.push({ start: cursor, end: dayEnd, durationMinutes });
    }
  }

  return windows;
}
