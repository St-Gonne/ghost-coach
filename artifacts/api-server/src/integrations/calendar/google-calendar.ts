import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { calendarConnectionsTable } from "@workspace/db/schema";
import type { CalendarAdapter } from "./index";
import type { CalendarEvent } from "../../domain/types";
import { config } from "../../config";
import { decryptToken, encryptToken } from "../../auth/token-crypto";

const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";
const WRITE_CALENDAR_SUMMARY = "Ghost Coach";

interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
  selected: boolean;
  writeSelected: boolean;
}

type GoogleConnection = typeof calendarConnectionsTable.$inferSelect;

function parseGoogleDateTime(value?: { dateTime?: string; date?: string }): Date {
  if (value?.dateTime) return new Date(value.dateTime);
  if (value?.date) return new Date(`${value.date}T00:00:00.000Z`);
  return new Date(0);
}

function inferRemote(item: Record<string, unknown>): boolean {
  const hangoutLink = typeof item["hangoutLink"] === "string";
  const location = typeof item["location"] === "string" ? item["location"] : "";
  const description =
    typeof item["description"] === "string" ? item["description"] : "";

  return (
    hangoutLink ||
    /zoom|meet\.google|teams|webex/i.test(location) ||
    /zoom|meet\.google|teams|webex/i.test(description)
  );
}

function inferInternal(item: Record<string, unknown>): boolean {
  const attendees = Array.isArray(item["attendees"])
    ? item["attendees"]
    : [];
  const emails = attendees
    .map((attendee) =>
      attendee && typeof attendee === "object"
        ? (attendee as Record<string, unknown>)["email"]
        : null,
    )
    .filter((email): email is string => typeof email === "string");

  if (emails.length === 0) return false;

  const domains = new Set(
    emails
      .map((email) => email.split("@")[1] ?? "")
      .filter((domain) => domain.length > 0),
  );

  return domains.size <= 1;
}

export class GoogleCalendarAdapter implements CalendarAdapter {
  readonly connected = true;
  readonly mock = false;

  private async getConnection(userId: string): Promise<GoogleConnection> {
    const rows = await db
      .select()
      .from(calendarConnectionsTable)
      .where(
        and(
          eq(calendarConnectionsTable.userId, userId),
          eq(calendarConnectionsTable.provider, "google"),
        ),
      )
      .limit(1);

    const connection = rows[0];
    if (!connection) {
      throw new Error("Google Calendar is not connected");
    }

    return connection;
  }

  private async refreshAccessTokenIfNeeded(connection: GoogleConnection) {
    const expiresAt = connection.tokenExpiry?.getTime() ?? 0;
    const accessToken = decryptToken(connection.encryptedAccessToken);
    const refreshToken = decryptToken(connection.encryptedRefreshToken);

    if (accessToken && expiresAt > Date.now() + 60_000) {
      return { accessToken, connection };
    }

    if (!refreshToken) {
      throw new Error("Google refresh token is missing");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !json.access_token) {
      throw new Error(
        json.error_description ?? json.error ?? "Failed to refresh Google access token",
      );
    }

    const [updated] = await db
      .update(calendarConnectionsTable)
      .set({
        encryptedAccessToken: encryptToken(json.access_token),
        tokenExpiry: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
        grantedScopes: json.scope ?? connection.grantedScopes,
        status: "active",
        lastSuccessAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnectionsTable.id, connection.id))
      .returning();

    return { accessToken: json.access_token, connection: updated ?? connection };
  }

  private async withAccessToken(userId: string) {
    const connection = await this.getConnection(userId);
    return this.refreshAccessTokenIfNeeded(connection);
  }

  async listCalendarChoices(userId: string): Promise<GoogleCalendarListEntry[]> {
    const { accessToken, connection } = await this.withAccessToken(userId);
    const response = await fetch(`${GOOGLE_API_BASE}/users/me/calendarList`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const json = (await response.json()) as {
      items?: Array<{
        id?: string;
        summary?: string;
        primary?: boolean;
        accessRole?: string;
      }>;
    };

    if (!response.ok) {
      throw new Error("Failed to list Google calendars");
    }

    const selected = new Set(connection.selectedReadCalendarIds ?? []);
    return (json.items ?? [])
      .filter(
        (item): item is {
          id: string;
          summary: string;
          primary?: boolean;
          accessRole?: string;
        } => Boolean(item.id && item.summary),
      )
      .map((item) => ({
        id: item.id,
        summary: item.summary,
        primary: Boolean(item.primary),
        accessRole: item.accessRole ?? "reader",
        selected: selected.has(item.id),
        writeSelected: connection.writeCalendarId === item.id,
      }));
  }

  async ensureWriteCalendar(userId: string): Promise<{
    calendarId: string;
    summary: string;
    created: boolean;
  }> {
    const connection = await this.getConnection(userId);
    const calendars = await this.listCalendarChoices(userId);
    const existing =
      calendars.find((calendar) => calendar.id === connection.writeCalendarId) ??
      calendars.find((calendar) => calendar.summary === WRITE_CALENDAR_SUMMARY);

    if (existing) {
      if (connection.writeCalendarId !== existing.id) {
        await db
          .update(calendarConnectionsTable)
          .set({ writeCalendarId: existing.id, updatedAt: new Date() })
          .where(eq(calendarConnectionsTable.id, connection.id));
      }

      return {
        calendarId: existing.id,
        summary: existing.summary,
        created: false,
      };
    }

    const { accessToken } = await this.withAccessToken(userId);
    const createResponse = await fetch(`${GOOGLE_API_BASE}/calendars`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ summary: WRITE_CALENDAR_SUMMARY }),
    });
    const created = (await createResponse.json()) as {
      id?: string;
      summary?: string;
    };

    if (!createResponse.ok || !created.id) {
      throw new Error("Failed to create Ghost Coach calendar");
    }

    await db
      .update(calendarConnectionsTable)
      .set({
        writeCalendarId: created.id,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnectionsTable.id, connection.id));

    return {
      calendarId: created.id,
      summary: created.summary ?? WRITE_CALENDAR_SUMMARY,
      created: true,
    };
  }

  async setReadCalendars(userId: string, calendarIds: string[]): Promise<void> {
    const connection = await this.getConnection(userId);
    await db
      .update(calendarConnectionsTable)
      .set({
        selectedReadCalendarIds: calendarIds,
        updatedAt: new Date(),
      })
      .where(eq(calendarConnectionsTable.id, connection.id));
  }

  async listEvents(userId: string, from: Date, to: Date): Promise<CalendarEvent[]> {
    const { accessToken, connection } = await this.withAccessToken(userId);
    const calendarIds = connection.selectedReadCalendarIds ?? [];

    if (calendarIds.length === 0) {
      return [];
    }

    const results = await Promise.all(
      calendarIds.map(async (calendarId) => {
        const url = new URL(
          `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
        );
        url.searchParams.set("singleEvents", "true");
        url.searchParams.set("orderBy", "startTime");
        url.searchParams.set("timeMin", from.toISOString());
        url.searchParams.set("timeMax", to.toISOString());

        const response = await fetch(url, {
          headers: { authorization: `Bearer ${accessToken}` },
        });

        const json = (await response.json()) as {
          items?: Array<Record<string, unknown>>;
        };

        if (!response.ok) {
          throw new Error(`Failed to read events from calendar ${calendarId}`);
        }

        return (json.items ?? []).map((item) => {
          const title =
            typeof item["summary"] === "string" ? item["summary"] : undefined;
          const isRemote = inferRemote(item);
          const isHighStakes = /interview|board|client|review/i.test(title ?? "");

          return {
            id: String(item["id"] ?? ""),
            calendarId,
            startAt: parseGoogleDateTime(item["start"] as Record<string, string>),
            endAt: parseGoogleDateTime(item["end"] as Record<string, string>),
            titleRedacted: title,
            locationText:
              typeof item["location"] === "string" ? item["location"] : undefined,
            isAllDay: Boolean((item["start"] as Record<string, string> | undefined)?.date),
            isCancelled: item["status"] === "cancelled",
            isRemote,
            isInternal: inferInternal(item),
            isHighStakes,
            walkingCallEligible: isRemote && !isHighStakes,
          } satisfies CalendarEvent;
        });
      }),
    );

    return results.flat();
  }

  async createEvent(
    userId: string,
    event: {
      title: string;
      startAt: Date;
      endAt: Date;
      description?: string;
    },
  ): Promise<{ eventId: string }> {
    const { accessToken, connection } = await this.withAccessToken(userId);
    if (!connection.writeCalendarId) {
      throw new Error("Dedicated Ghost Coach write calendar is not configured");
    }

    const response = await fetch(
      `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(connection.writeCalendarId)}/events`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: { dateTime: event.startAt.toISOString() },
          end: { dateTime: event.endAt.toISOString() },
        }),
      },
    );

    const json = (await response.json()) as { id?: string };
    if (!response.ok || !json.id) {
      throw new Error("Failed to create Google Calendar event");
    }

    return { eventId: json.id };
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const { accessToken, connection } = await this.withAccessToken(userId);
    if (!connection.writeCalendarId) {
      throw new Error("Dedicated Ghost Coach write calendar is not configured");
    }

    const response = await fetch(
      `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(connection.writeCalendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok && response.status !== 404) {
      throw new Error("Failed to delete Google Calendar event");
    }
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    try {
      if (
        !config.google.clientId ||
        !config.google.clientSecret ||
        !config.google.redirectUri
      ) {
        return { ok: false, error: "Google OAuth is not configured" };
      }

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Calendar health check failed",
      };
    }
  }
}
