import { Router } from "express";
import { getAdapters } from "../../integrations";

const router = Router();

router.get("/integrations/status", async (req, res) => {
  try {
    const adapters = getAdapters();

    const [calendarHealth, weatherHealth, telegramHealth, llmHealth] = await Promise.all([
      adapters.calendar.healthCheck(),
      adapters.weather.healthCheck(),
      adapters.telegram.healthCheck(),
      adapters.llm.healthCheck(),
    ]);

    return res.json({
      mockMode: adapters.calendar.mock && adapters.weather.mock && adapters.telegram.mock && adapters.llm.mock,
      calendar: {
        connected: adapters.calendar.connected,
        mock: adapters.calendar.mock,
        lastCheckAt: new Date().toISOString(),
        error: calendarHealth.ok ? null : calendarHealth.error,
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

export default router;
