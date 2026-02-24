"use client";

import { memo, useCallback } from "react";
import {
  IconCloudRain,
  IconMoodSmile,
  IconUser,
  IconUserOff,
} from "@tabler/icons-react";

import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SettingRowShell } from "@/features/settings/ui/SettingCardShell";
import {
  DEFAULT_GREETING_PREFERENCES,
  resolveGreetingPreferences,
  type GreetingTheme,
} from "@/features/dashboard/greeting.preferences";
import { useSetting } from "@/ui/hooks/useSettings";
import type { SettingItem } from "@/features/settings/settings.types";
import { getSettingIcon } from "./setting-icons";

interface SettingGreetingPreferencesProps {
  setting: SettingItem;
}

function SettingGreetingPreferencesComponent({
  setting,
}: SettingGreetingPreferencesProps) {
  const [rawValue, setValue] = useSetting("greetingPreferences");
  const prefs = resolveGreetingPreferences(rawValue);

  const updatePreferences = useCallback(
    (patch: Partial<typeof DEFAULT_GREETING_PREFERENCES>) => {
      setValue({
        ...prefs,
        ...patch,
      });
    },
    [prefs, setValue],
  );

  const isDisabled = !prefs.enabled;

  return (
    <div className="flex flex-col">
      <SettingRowShell
        label="Show Greeting"
        description={setting.description}
        icon={getSettingIcon(setting.id)}
        trailing={(
          <Switch
            id="setting-greeting-enabled"
            checked={prefs.enabled}
            onCheckedChange={(nextValue) => {
              updatePreferences({ enabled: nextValue });
            }}
            aria-label="Show Greeting"
            className="mt-1"
          />
        )}
      />

      <SettingRowShell
        label="Weather Forecast"
        description="Uses Open-Meteo - no account required."
        icon={<IconCloudRain className="size-[18px] text-muted-foreground shrink-0" />}
        disabled={isDisabled}
        trailing={(
          <Switch
            id="setting-greeting-weather"
            checked={prefs.includeWeather}
            disabled={isDisabled}
            onCheckedChange={(nextValue) => {
              updatePreferences({ includeWeather: nextValue });
            }}
            aria-label="Weather Forecast"
            className="mt-1"
          />
        )}
      />

      <SettingRowShell
        label="Use My Name"
        description="Use your first name in the greeting headline."
        icon={(
          isDisabled
            ? <IconUserOff className="size-[18px] text-muted-foreground shrink-0" />
            : <IconUser className="size-[18px] text-muted-foreground shrink-0" />
        )}
        disabled={isDisabled}
        trailing={(
          <Switch
            id="setting-greeting-name"
            checked={prefs.useName}
            disabled={isDisabled}
            onCheckedChange={(nextValue) => {
              updatePreferences({ useName: nextValue });
            }}
            aria-label="Use My Name"
            className="mt-1"
          />
        )}
      />

      <SettingRowShell
        label="Greeting Style"
        description="Choose study-focused, motivational, or primary-only mode."
        icon={<IconMoodSmile className="size-[18px] text-muted-foreground shrink-0" />}
        disabled={isDisabled}
        trailing={(
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={1}
            value={[prefs.greetingTheme]}
            onValueChange={(values: string[]) => {
              const nextTheme = values[0];
              if (
                nextTheme === "study"
                || nextTheme === "motivational"
                || nextTheme === "minimal"
              ) {
                updatePreferences({ greetingTheme: nextTheme as GreetingTheme });
              }
            }}
            className={isDisabled ? "pointer-events-none opacity-60" : undefined}
          >
            <ToggleGroupItem
              value="study"
              aria-label="Study Mode"
              className="h-8 px-2 text-[11px]"
              disabled={isDisabled}
            >
              Study Mode
            </ToggleGroupItem>
            <ToggleGroupItem
              value="motivational"
              aria-label="Motivational"
              className="h-8 px-2 text-[11px]"
              disabled={isDisabled}
            >
              Motivational
            </ToggleGroupItem>
            <ToggleGroupItem
              value="minimal"
              aria-label="Minimal"
              className="h-8 px-2 text-[11px]"
              disabled={isDisabled}
            >
              Minimal
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      />
    </div>
  );
}

export const SettingGreetingPreferences = memo(SettingGreetingPreferencesComponent);
