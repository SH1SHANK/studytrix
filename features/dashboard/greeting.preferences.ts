export type GreetingTheme = "study" | "motivational" | "minimal";

export interface GreetingPreferences {
  enabled: boolean;
  includeWeather: boolean;
  useName: boolean;
  greetingTheme: GreetingTheme;
}

export const DEFAULT_GREETING_PREFERENCES: GreetingPreferences = {
  enabled: true,
  includeWeather: true,
  useName: true,
  greetingTheme: "study",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function resolveGreetingPreferences(raw: unknown): GreetingPreferences {
  if (!isRecord(raw)) {
    return { ...DEFAULT_GREETING_PREFERENCES };
  }

  const theme =
    raw.greetingTheme === "study"
    || raw.greetingTheme === "motivational"
    || raw.greetingTheme === "minimal"
      ? raw.greetingTheme
      : DEFAULT_GREETING_PREFERENCES.greetingTheme;

  return {
    enabled:
      typeof raw.enabled === "boolean"
        ? raw.enabled
        : DEFAULT_GREETING_PREFERENCES.enabled,
    includeWeather:
      typeof raw.includeWeather === "boolean"
        ? raw.includeWeather
        : DEFAULT_GREETING_PREFERENCES.includeWeather,
    useName:
      typeof raw.useName === "boolean"
        ? raw.useName
        : DEFAULT_GREETING_PREFERENCES.useName,
    greetingTheme: theme,
  };
}
