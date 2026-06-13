import { describe, it, expect } from "vitest";
import {
  localDateString,
  localTimeStringToUtc,
  toLocalDate,
  toLocalTime,
  isInQuietHours,
  minutesBetween,
} from "../../src/domain/time";

describe("time utilities", () => {
  it("localTimeStringToUtc converts HH:MM local time to UTC correctly for IST", () => {
    // IST is UTC+5:30
    // 07:30 IST = 02:00 UTC
    const utc = localTimeStringToUtc("2025-01-15", "07:30", "Asia/Kolkata");
    expect(utc.getUTCHours()).toBe(2);
    expect(utc.getUTCMinutes()).toBe(0);
  });

  it("toLocalDate converts UTC to local date string for IST", () => {
    // 23:00 UTC on Jan 14 = 04:30 IST on Jan 15
    const utc = new Date("2025-01-14T23:00:00Z");
    const localDate = toLocalDate(utc, "Asia/Kolkata");
    expect(localDate).toBe("2025-01-15");
  });

  it("toLocalTime returns HH:MM format for a given UTC timestamp in timezone", () => {
    // 02:00 UTC = 07:30 IST (UTC+5:30)
    const utc = new Date("2025-01-15T02:00:00Z");
    const localTime = toLocalTime(utc, "Asia/Kolkata");
    expect(localTime).toBe("07:30");
  });

  it("minutesBetween returns correct duration", () => {
    const a = new Date("2025-01-15T10:00:00Z");
    const b = new Date("2025-01-15T10:45:00Z");
    expect(minutesBetween(a, b)).toBe(45);
  });

  it("minutesBetween returns 0 for same time", () => {
    const t = new Date("2025-01-15T10:00:00Z");
    expect(minutesBetween(t, t)).toBe(0);
  });

  it("isInQuietHours returns true when inside quiet hours", () => {
    // Quiet hours 22:00-07:00 IST
    // 22:30 IST = 17:00 UTC
    const now = new Date("2025-01-15T17:00:00Z");
    const inQuiet = isInQuietHours(now, "22:00", "07:00", "2025-01-15", "Asia/Kolkata");
    expect(inQuiet).toBe(true);
  });

  it("isInQuietHours returns false when outside quiet hours", () => {
    // 10:00 IST = 04:30 UTC
    const now = new Date("2025-01-15T04:30:00Z");
    const inQuiet = isInQuietHours(now, "22:00", "07:00", "2025-01-15", "Asia/Kolkata");
    expect(inQuiet).toBe(false);
  });
});
