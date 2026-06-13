import type { CalendarEvent } from "../../domain/types";

export interface CalendarAdapter {
  readonly connected: boolean;
  readonly mock: boolean;

  listEvents(userId: string, from: Date, to: Date): Promise<CalendarEvent[]>;

  createEvent(
    userId: string,
    event: {
      title: string;
      startAt: Date;
      endAt: Date;
      description?: string;
    },
  ): Promise<{ eventId: string }>;

  deleteEvent(userId: string, eventId: string): Promise<void>;

  healthCheck(): Promise<{ ok: boolean; error?: string }>;
}
