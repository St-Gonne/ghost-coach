import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { calendarConnectionsTable } from "@workspace/db/schema";
import { getAdapters } from "../../integrations";
import { requireRequestUser } from "../../auth/user";
import { config } from "../../config";

const router = Router();

async function getGoogleConnection(userId: string) {
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

  return rows[0] ?? null;
}

router.get("/integrations/status", async (req, res) => {
  try {
    const user = requireRequestUser(req);
    const adapters = getAdapters();
    const connection = await getGoogleConnection(user.id);

    const [calendarHealth, weatherHealth, telegramHealth, llmHealth] =
      await Promise.all([
        adapters.calendar.healthCheck(),
        adapters.weather.healthCheck(),
        adapters.telegram.healthCheck(),
        adapters.llm.healthCheck(),
      ]);

    return res.json({
      mockMode:
        adapters.calendar.mock &&
        adapters.weather.mock &&
        adapters.telegram.mock &&
        adapters.llm.mock,
      auth: {
        authenticated: true,
        allowedEmailConfigured: Boolean(config.allowedEmail),
        userEmail: user.email,
      },
      calendar: {
        connected: adapters.calendar.mock ? false : Boolean(connection),
        mock: adapters.calendar.mock,
        providerAccountEmail: connection?.providerAccountEmail ?? null,
        selectedReadCalendarIds: connection?.selectedReadCalendarIds ?? [],
        writeCalendarId: connection?.writeCalendarId ?? null,
        lastSuccessAt: connection?.lastSuccessAt?.toISOString() ?? null,
        lastCheckAt: new Date().toISOString(),
        error:
          connection?.lastError ?? (calendarHealth.ok ? null : calendarHealth.error),
      },
      weather: {
        connected: adapters.weather.connected,
        mock: adapters.weather.mock,
        lastCheckAt: new Date().toISOString(),
        error: weatherHealth.ok ? null : weatherHealth.error,
      },
      telegram: {
        connected: adapters.telegram.connected,
        mock: adapters.telegram.mock,
        lastCheckAt: new Date().toISOString(),
        error: telegramHealth.ok ? null : telegramHealth.error,
      },
      llm: {
        connected: adapters.llm.connected,
        mock: adapters.llm.mock,
        lastCheckAt: new Date().toISOString(),
        error: llmHealth.ok ? null : llmHealth.error,
      },
    });
  } catch (err) {
    req.log.error({ err }, "GET /integrations/status error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/integrations/google/calendars", async (req, res) => {
  try {
    const user = requireRequestUser(req);
    const adapters = getAdapters();
    const connection = await getGoogleConnection(user.id);

    if (!adapters.calendar.listCalendarChoices) {
      return res.json({
        calendars: [
          {
            id: "mock-calendar",
            summary: "Mock Calendar",
            primary: true,
            accessRole: "owner",
            selected: true,
            writeSelected: true,
          },
        ],
      });
    }

    if (!connection) {
      return res.json({ calendars: [] });
    }

    return res.json({
      calendars: await adapters.calendar.listCalendarChoices(user.id),
    });
  } catch (err) {
    req.log.error({ err }, "GET /integrations/google/calendars error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/integrations/google/read-calendars", async (req, res) => {
  try {
    const user = requireRequestUser(req);
    const adapters = getAdapters();
    const calendarIds = Array.isArray(req.body?.calendarIds)
      ? req.body.calendarIds.filter((value: unknown): value is string => typeof value === "string")
      : [];

    if (!adapters.calendar.setReadCalendars) {
      return res.status(400).json({ error: "Read calendar selection is unavailable in mock mode" });
    }

    await adapters.calendar.setReadCalendars(user.id, calendarIds);
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "POST /integrations/google/read-calendars error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/integrations/google/write-calendar/ensure", async (req, res) => {
  try {
    const user = requireRequestUser(req);
    const adapters = getAdapters();

    if (!adapters.calendar.ensureWriteCalendar) {
      return res.json({
        calendarId: "mock-calendar",
        summary: "Mock Calendar",
        created: false,
      });
    }

    return res.json(await adapters.calendar.ensureWriteCalendar(user.id));
  } catch (err) {
    req.log.error({ err }, "POST /integrations/google/write-calendar/ensure error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/integrations/google/test-read", async (req, res) => {
  try {
    const user = requireRequestUser(req);
    const adapters = getAdapters();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const events = await adapters.calendar.listEvents(user.id, now, tomorrow);
    return res.json({
      ok: true,
      eventCount: events.length,
    });
  } catch (err) {
    req.log.error({ err }, "POST /integrations/google/test-read error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/integrations/google/test-write", async (req, res) => {
  try {
    const user = requireRequestUser(req);
    const adapters = getAdapters();

    if (adapters.calendar.ensureWriteCalendar) {
      await adapters.calendar.ensureWriteCalendar(user.id);
    }

    const startAt = new Date(Date.now() + 15 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 15 * 60 * 1000);
    const created = await adapters.calendar.createEvent(user.id, {
      title: "Ghost Coach write test",
      startAt,
      endAt,
      description: "Temporary verification event created and deleted by Ghost Coach.",
    });
    await adapters.calendar.deleteEvent(user.id, created.eventId);

    return res.json({
      ok: true,
      eventId: created.eventId,
    });
  } catch (err) {
    req.log.error({ err }, "POST /integrations/google/test-write error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
