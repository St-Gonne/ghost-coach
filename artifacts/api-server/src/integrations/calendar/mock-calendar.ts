import { v4 as uuidv4 } from "uuid";
import type { CalendarAdapter } from "./index";
import type { CalendarEvent } from "../../domain/types";

interface MockEventSpec {
  offsetMinutes: number;
  durationMinutes: number;
  title: string;
  isRemote: boolean;
  isHighStakes: boolean;
}

const defaultDayEvents: MockEventSpec[] = [
  {
    offsetMinutes: 9 * 60,
    durationMinutes: 60,
    title: "Team Standup",
    isRemote: true,
    isHighStakes: false,
  },
  {
    offsetMinutes: 11 * 60,
    durationMinutes: 90,
    title: "Client Call",
    isRemote: false,
    isHighStakes: true,
  },
  {
    offsetMinutes: 14 * 60,
    durationMinutes: 60,
    title: "1:1 with PM",
    isRemote: true,
    isHighStakes: false,
  },
  {
    offsetMinutes: 17 * 60,
    durationMinutes: 60,
    title: "Deep Work Block",
    isRemote: true,
    isHighStakes: false,
  },
];

export class MockCalendarAdapter implements CalendarAdapter {
  readonly connected = false;
  readonly mock = true;

  private readonly createdEvents: Map<string, CalendarEvent> = new Map();

  async listEvents(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<CalendarEvent[]> {
    // `from` is already the UTC instant corresponding to local midnight.
    // Resetting it with server-local setHours() shifts mock events in non-UTC timezones.
    const dayStart = new Date(from);

    const generated: CalendarEvent[] = defaultDayEvents.map((spec, i) => {
      const start = new Date(dayStart.getTime() + spec.offsetMinutes * 60000);
      const end = new Date(start.getTime() + spec.durationMinutes * 60000);
      return {
        id: `mock-event-${i}-${dayStart.toISOString().split("T")[0]}`,
        calendarId: "mock-calendar",
        startAt: start,
        endAt: end,
        titleRedacted: spec.title,
        isAllDay: false,
        isCancelled: false,
        isRemote: spec.isRemote,
        isInternal: true,
        isHighStakes: spec.isHighStakes,
        walkingCallEligible: spec.isRemote && !spec.isHighStakes,
      };
    });

    const manualEvents = Array.from(this.createdEvents.values()).filter(
      (e) => e.startAt >= from && e.endAt <= to,
    );

    return [...generated, ...manualEvents];
  }

  async createEvent(
    userId: string,
    event: { title: string; startAt: Date; endAt: Date; description?: string },
  ): Promise<{ eventId: string }> {
    const eventId = `ghost-coach-${uuidv4()}`;
    const calEvent: CalendarEvent = {
      id: eventId,
      calendarId: "mock-calendar",
      startAt: event.startAt,
      endAt: event.endAt,
      titleRedacted: event.title,
      isAllDay: false,
      isCancelled: false,
      isRemote: false,
      isInternal: true,
      isHighStakes: false,
      walkingCallEligible: false,
    };
    this.createdEvents.set(eventId, calEvent);
    return { eventId };
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    this.createdEvents.delete(eventId);
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }
}

export const MOCK_SCENARIOS: Record<string, MockEventSpec[]> = {
  normal: defaultDayEvents,
  packed: [
    {
      offsetMinutes: 8 * 60,
      durationMinutes: 120,
      title: "All-hands",
      isRemote: false,
      isHighStakes: true,
    },
    {
      offsetMinutes: 10 * 60,
      durationMinutes: 90,
      title: "Client Workshop",
      isRemote: false,
      isHighStakes: true,
    },
    {
      offsetMinutes: 13 * 60,
      durationMinutes: 120,
      title: "Sprint Planning",
      isRemote: true,
      isHighStakes: false,
    },
    {
      offsetMinutes: 15 * 60,
      durationMinutes: 120,
      title: "Retrospective",
      isRemote: true,
      isHighStakes: false,
    },
    {
      offsetMinutes: 18 * 60,
      durationMinutes: 60,
      title: "Evening Call",
      isRemote: true,
      isHighStakes: false,
    },
  ],
  light: [
    {
      offsetMinutes: 10 * 60,
      durationMinutes: 30,
      title: "Quick Check-in",
      isRemote: true,
      isHighStakes: false,
    },
  ],
  free: [],
};
