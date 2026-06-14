import { beforeEach, describe, expect, it, vi } from "vitest";

describe("OpenMeteoWeatherAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1";
  });

  it("classifies blocked weather from severe hourly values", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          temperature_2m: [29, 41, 34],
          precipitation_probability: [5, 80, 10],
          wind_speed_10m: [10, 22, 18],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { OpenMeteoWeatherAdapter } = await import(
      "../../src/integrations/weather/open-meteo"
    );

    const adapter = new OpenMeteoWeatherAdapter();
    const snapshot = await adapter.getWeather(15.2993, 74.124, "Asia/Kolkata", "2025-01-15");

    expect(snapshot.condition).toBe("OUTDOOR_BLOCKED");
    expect(snapshot.temperatureC).toBe(41);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches a repeated request for the same day", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          temperature_2m: [27, 28],
          precipitation_probability: [10, 15],
          wind_speed_10m: [12, 14],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { OpenMeteoWeatherAdapter } = await import(
      "../../src/integrations/weather/open-meteo"
    );

    const adapter = new OpenMeteoWeatherAdapter();
    const first = await adapter.getWeather(15.2993, 74.124, "Asia/Kolkata", "2025-01-15");
    const second = await adapter.getWeather(15.2993, 74.124, "Asia/Kolkata", "2025-01-15");

    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
