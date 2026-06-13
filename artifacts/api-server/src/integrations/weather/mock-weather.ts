import type { WeatherAdapter } from "./index";
import type { WeatherSnapshot } from "../../domain/types";

export type WeatherScenario =
  | "good"
  | "outdoor_good"
  | "hot"
  | "extreme_heat"
  | "rainy"
  | "outdoor_blocked"
  | "windy"
  | "outdoor_caution"
  | "indoor_only";

const SCENARIOS: Record<WeatherScenario, WeatherSnapshot> = {
  good: {
    condition: "OUTDOOR_GOOD",
    temperatureC: 27,
    rainProbabilityPercent: 5,
    windSpeedKph: 12,
    summary: "Clear skies, pleasant temperature — ideal for outdoor activity.",
    fetchedAt: new Date().toISOString(),
  },
  outdoor_good: {
    condition: "OUTDOOR_GOOD",
    temperatureC: 27,
    rainProbabilityPercent: 5,
    windSpeedKph: 12,
    summary: "Clear skies, pleasant temperature — ideal for outdoor activity.",
    fetchedAt: new Date().toISOString(),
  },
  hot: {
    condition: "OUTDOOR_BLOCKED",
    temperatureC: 38,
    rainProbabilityPercent: 0,
    windSpeedKph: 8,
    summary: "Very hot. Stay indoors or go early morning.",
    fetchedAt: new Date().toISOString(),
  },
  extreme_heat: {
    condition: "OUTDOOR_BLOCKED",
    temperatureC: 41,
    rainProbabilityPercent: 0,
    windSpeedKph: 5,
    summary: "Extreme heat (41 °C). Outdoor activity blocked.",
    fetchedAt: new Date().toISOString(),
  },
  rainy: {
    condition: "OUTDOOR_BLOCKED",
    temperatureC: 24,
    rainProbabilityPercent: 85,
    windSpeedKph: 18,
    summary: "Heavy rain expected. Indoor-only day.",
    fetchedAt: new Date().toISOString(),
  },
  outdoor_blocked: {
    condition: "OUTDOOR_BLOCKED",
    temperatureC: 26,
    rainProbabilityPercent: 80,
    windSpeedKph: 22,
    summary: "Rain and wind. Outdoor activity blocked.",
    fetchedAt: new Date().toISOString(),
  },
  windy: {
    condition: "OUTDOOR_CAUTION",
    temperatureC: 29,
    rainProbabilityPercent: 15,
    windSpeedKph: 48,
    summary: "Strong winds — use caution for outdoor activities.",
    fetchedAt: new Date().toISOString(),
  },
  outdoor_caution: {
    condition: "OUTDOOR_CAUTION",
    temperatureC: 32,
    rainProbabilityPercent: 30,
    windSpeedKph: 35,
    summary: "Caution advised for outdoor activities.",
    fetchedAt: new Date().toISOString(),
  },
  indoor_only: {
    condition: "INDOOR_ONLY",
    temperatureC: 22,
    rainProbabilityPercent: 0,
    windSpeedKph: 5,
    summary: "Indoor location — weather not applicable.",
    fetchedAt: new Date().toISOString(),
  },
};

export class MockWeatherAdapter implements WeatherAdapter {
  readonly connected = false;
  readonly mock = true;

  private scenario: WeatherScenario = "good";

  setScenario(scenario: WeatherScenario): void {
    this.scenario = scenario;
  }

  async getWeather(
    _latitude: number,
    _longitude: number,
    _timezone: string,
    _date: string,
  ): Promise<WeatherSnapshot> {
    return { ...SCENARIOS[this.scenario]!, fetchedAt: new Date().toISOString() };
  }

  async healthCheck(): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }
}
