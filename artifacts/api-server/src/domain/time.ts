import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { startOfDay, endOfDay, addMinutes, isWithinInterval, parseISO, format } from "date-fns";

export function nowInZone(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}

export function localDateString(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

export function localTimeStringToUtc(
  localDate: string,
  localTime: string,
  timezone: string,
): Date {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  const localDt = new Date(year!, month! - 1, day!, hour!, minute!, 0, 0);
  return fromZonedTime(localDt, timezone);
}

export function toLocalDate(utcDate: Date, timezone: string): string {
  return formatInTimeZone(utcDate, timezone, "yyyy-MM-dd");
}

export function toLocalTime(utcDate: Date, timezone: string): string {
  return formatInTimeZone(utcDate, timezone, "HH:mm");
}

export function zonedDayStart(localDate: string, timezone: string): Date {
  const [year, month, day] = localDate.split("-").map(Number);
  const d = new Date(year!, month! - 1, day!, 0, 0, 0, 0);
  return fromZonedTime(d, timezone);
}

export function zonedDayEnd(localDate: string, timezone: string): Date {
  const [year, month, day] = localDate.split("-").map(Number);
  const d = new Date(year!, month! - 1, day!, 23, 59, 59, 999);
  return fromZonedTime(d, timezone);
}

export function isInQuietHours(
  now: Date,
  quietStart: string,
  quietEnd: string,
  localDate: string,
  timezone: string,
): boolean {
  const startUtc = localTimeStringToUtc(localDate, quietStart, timezone);
  let endUtc = localTimeStringToUtc(localDate, quietEnd, timezone);
  if (endUtc <= startUtc) {
    endUtc = addMinutes(endUtc, 24 * 60);
  }
  return isWithinInterval(now, { start: startUtc, end: endUtc });
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 60000);
}

export function addMins(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

export function formatUtcForDisplay(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "EEE MMM d, HH:mm");
}

export function isoString(date: Date): string {
  return date.toISOString();
}

export function fromIso(s: string): Date {
  return parseISO(s);
}
