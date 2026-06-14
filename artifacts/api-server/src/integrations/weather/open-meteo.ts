import type { WeatherSnapshot } from "../../domain/types";
import type { WeatherAdapter } from "./index";
import { config } from "../../config";

type CacheEntry = {
  snapshot: WeatherSnapshot;
  cachedAt: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000;

function classifyWeather(params: {
  maxTemperatureC: number;
  maxRainProbabilityPercent: number;
  maxWindKph: number;
}): WeatherSnapshot["condition"] {
  if (
    params.maxTemperatureC >= 38 ||
    params.maxRainProbabilityPercent >= 70 ||
    params.maxWindKph >= 45
  ) {
    return "OUTDOOR_BLOCKED";
  }

  if (
    params.maxTemperatureC >= 33 ||
    params.maxRainProbabilityPercent >= 40 ||
    params.maxWindKph >= 30
  ) {
    return "OUTDOOR_CAUTION";
  }

  return "OUTDOOR_GOOD";
}

export class OpenMeteoWeatherAdapter implements WeatherAdapter {
  readonly connected = true;
  readonly mock = false;

  private readonly cache = new Map<string, CacheEntry>();

  async getWeather(
    latitude: number,
    longitude: number,
    timezone: string,
    date: string,
  ): Promise<WeatherSnapshot> {
    const cacheKey = `${latitude}:${longitude}:${date}:${timezone}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.snapshot;
    }

    const url = new URL(`${config.weather.openMeteoBaseUrl}/forecast`);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set(
      "hourly",
      "temperature_2m,precipitation_probability,wind_speed_10m",
    );
    url.searchParams.set("timezone", timezone);
    url.searchParams.set("start_date", date);
    url.searchParams.set("end_date", date);

    const response = await fetch(url);
    const json = (await response.json()) as {
      hourly?: {
        temperature_2m?: number[];
        precipitation_probability?: number[];
        wind_speed_10m?: number[];
      };
    };

    if (!response.ok || !json.hourly) {
      throw new Error("Failed to load Open-Meteo forecast");
    }

    const temperatures = json.hourly.temperature_2m ?? [];
    const rainProbabilities = json.hourly.precipitation_probability ?? [];
    const windSpeeds = json.hourly.wind_speed_10m ?? [];

    const maxTemperatureC = Math.max(...temperatures, 0);
    const maxRainProbabilityPercent = Math.max(...rainProbabilities, 0);
    const maxWindKph = Math.max(...windSpeeds, 0);
    const snapshot: WeatherSnapshot = {
      condition: classifyWeather({
        maxTemperatureC,
        maxRainProbabilityPercent,
        maxWindKph,
      }),
      temperatureC: maxTemperatureC,
      rainProbabilityPercent: maxRainProbabilityPercent,
      windSpeedKph: maxWindKph,
      summary: `Max ${maxTemperatureC}C, rain ${maxRainProbabilityPercent}%, wind ${maxWindKph} kph`,
      fetchedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { snapshot, cachedAt: Date.now() });
    return snapshot;
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    if (!config.weather.openMeteoBaseUrl) {
      return { ok: false, error: "Open-Meteo base URL is not configured" };
    }

    return { ok: true };
  }
}
