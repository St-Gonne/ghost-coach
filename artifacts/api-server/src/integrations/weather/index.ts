import type { WeatherSnapshot } from "../../domain/types";

export interface WeatherAdapter {
  readonly connected: boolean;
  readonly mock: boolean;

  getWeather(
    latitude: number,
    longitude: number,
    timezone: string,
    date: string,
  ): Promise<WeatherSnapshot>;

  healthCheck(): Promise<{ ok: boolean; error?: string }>;
}
