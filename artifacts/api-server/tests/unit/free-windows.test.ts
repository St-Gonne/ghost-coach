import { describe, it, expect } from "vitest";
import { generateFreeWindows } from "../../src/planner/free-windows";
import type { CalendarEvent, CoachingSettings } from "../../src/domain/types";

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

function makeEvent(startHour: number, durationMinutes: number, isRemote = false): CalendarEvent {
  const base = new Date("2025-01-15T00:00:00Z");
  const start = new Date(base.getTime() + startHour * 3600000);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return {
    id: `event-${startHour}`,
    calendarId: "primary",
    startAt: start,
    endAt: end,
    isAllDay: false,
    isCancelled: false,
    isRemote,
    isInternal: true,
    isHighStakes: false,
    walkingCallEligible: false,
  };
}

describe("generateFreeWindows", () => {
  it("empty calendar returns one large window covering the full day", () => {
    const windows = generateFreeWindows({
      calendarEvents: [],
      localDate: "2025-01-15",
      timezone: "UTC",
      settings: DEFAULT_SETTINGS,
    });
    expect(windows).toHaveLength(1);
    expect(windows[0]!.durationMinutes).toBe(14 * 60); // 07:00 to 21:00
  });

  it("single event splits the day into two windows", () => {
    const event = makeEvent(10, 60); // 10:00–11:00 UTC
    const windows = generateFreeWindows({
      calendarEvents: [event],
      localDate: "2025-01-15",
      timezone: "UTC",
      settings: DEFAULT_SETTINGS,
    });
    expect(windows.length).toBeGreaterThanOrEqual(2);
  });

  it("all-day event is excluded from blocking", () => {
    const allDay: CalendarEvent = {
      id: "all-day-1",
      calendarId: "primary",
      startAt: new Date("2025-01-15T00:00:00Z"),
      endAt: new Date("2025-01-15T23:59:59Z"),
      isAllDay: true,
      isCancelled: false,
      isRemote: false,
      isInternal: false,
      isHighStakes: false,
      walkingCallEligible: false,
    };
    const windows = generateFreeWindows({
      calendarEvents: [allDay],
      localDate: "2025-01-15",
      timezone: "UTC",
      settings: DEFAULT_SETTINGS,
    });
    expect(windows).toHaveLength(1);
    expect(windows[0]!.durationMinutes).toBe(14 * 60);
  });

  it("window shorter than minimum is excluded", () => {
    // Create two events that leave only a 5-min gap between them
    const event1 = makeEvent(10, 50);  // 10:00-10:50
    const event2 = makeEvent(11, 60);  // 11:00-12:00
    // Gap: 10:50 + 15min buffer = 11:05, and 11:00 - 15min buffer = 10:45, so they overlap
    const settingsWithHighMin = { ...DEFAULT_SETTINGS, minimumFreeWindowMinutes: 30 };
    const windows = generateFreeWindows({
      calendarEvents: [event1, event2],
      localDate: "2025-01-15",
      timezone: "UTC",
      settings: settingsWithHighMin,
    });
    // We should have fewer windows since small gaps are excluded
    const smallWindow = windows.find((w) => w.durationMinutes < 30);
    expect(smallWindow).toBeUndefined();
  });

  it("cancelled event does not block time", () => {
    const cancelled: CalendarEvent = {
      ...makeEvent(10, 60),
      isCancelled: true,
    };
    const windows = generateFreeWindows({
      calendarEvents: [cancelled],
      localDate: "2025-01-15",
      timezone: "UTC",
      settings: DEFAULT_SETTINGS,
    });
    expect(windows).toHaveLength(1);
  });
});
