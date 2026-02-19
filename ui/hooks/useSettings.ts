"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";

import { getSettingDefinition } from "@/features/settings/settings.registry";
import { searchSettings } from "@/features/settings/settings.search";
import { useSettingsStore } from "@/features/settings/settings.store";
import type { SettingItem } from "@/features/settings/settings.types";

function useSettingsInitialization(): void {
  const initialized = useSettingsStore((state) => state.initialized);
  const initialize = useSettingsStore((state) => state.initialize);

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);
}

export function useSetting(id: string): [unknown, (value: unknown) => void] {
  useSettingsInitialization();

  const definition = useMemo(() => getSettingDefinition(id), [id]);
  const defaultValue = definition?.defaultValue;
  const settingValue = useSettingsStore(
    useCallback(
      (state) => {
        const value = state.values[id];
        return value !== undefined ? value : defaultValue;
      },
      [defaultValue, id],
    ),
  );

  const setValue = useCallback(
    (value: unknown) => {
      useSettingsStore.getState().setValue(id, value);
    },
    [id],
  );

  const { setTheme } = useTheme();

  useEffect(() => {
    if (id !== "theme_mode") {
      return;
    }

    if (settingValue === "light" || settingValue === "dark" || settingValue === "system") {
      setTheme(settingValue);
    }
  }, [id, setTheme, settingValue]);

  return [settingValue, setValue];
}

export function useSettingsSearch(query: string): SettingItem[] {
  useSettingsInitialization();

  return useMemo(() => searchSettings(query), [query]);
}

export function useAllSettings(): Record<string, unknown> {
  useSettingsInitialization();

  return useSettingsStore((state) => state.values);
}
