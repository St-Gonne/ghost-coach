import type { CalendarAdapter } from "./calendar";
import type { WeatherAdapter } from "./weather";
import type { TelegramAdapter } from "./telegram";
import type { LLMAdapter } from "./llm";
import { MockCalendarAdapter } from "./calendar/mock-calendar";
import { MockWeatherAdapter } from "./weather/mock-weather";
import { MockTelegramAdapter } from "./telegram/mock-telegram";
import { MockLLMAdapter } from "./llm/mock-llm";
import type { WeatherScenario } from "./weather/mock-weather";
import { config } from "../config";

export interface AdapterRegistry {
  calendar: CalendarAdapter;
  weather: WeatherAdapter;
  telegram: TelegramAdapter;
  llm: LLMAdapter;
}

let registry: AdapterRegistry | null = null;

export function getAdapters(): AdapterRegistry {
  if (!registry) {
    if (config.mockIntegrations) {
      registry = {
        calendar: new MockCalendarAdapter(),
        weather: new MockWeatherAdapter(),
        telegram: new MockTelegramAdapter(),
        llm: new MockLLMAdapter(),
      };
    } else {
      registry = {
        calendar: new MockCalendarAdapter(),
        weather: new MockWeatherAdapter(),
        telegram: new MockTelegramAdapter(),
        llm: new MockLLMAdapter(),
      };
    }
  }
  return registry;
}

export function getDebugAdapters(
  weatherScenario?: WeatherScenario,
): AdapterRegistry {
  const adapters = getAdapters();

  if (!weatherScenario || !adapters.weather.mock) {
    return adapters;
  }

  const weather = new MockWeatherAdapter();
  weather.setScenario(weatherScenario);

  return {
    ...adapters,
    weather,
  };
}

export function resetAdapters(): void {
  registry = null;
}
