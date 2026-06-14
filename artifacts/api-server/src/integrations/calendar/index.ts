import type { CalendarEvent } from "../../domain/types";

export interface CalendarAdapter {
  readonly connected: boolean;
  readonly mock: boolean;

  listCalendarChoices?(
    userId: string,
  ): Promise<
    Array<{
      id: string;
      summary: string;
      primary: boolean;
      accessRole: string;
      selected: boolean;
      writeSelected: boolean;
    }>
  >;

  ensureWriteCalendar?(
    userId: string,
  ): Promise<{ calendarId: string; summary: string; created: boolean }>;

  setReadCalendars?(userId: string, calendarIds: string[]): Promise<void>;

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
