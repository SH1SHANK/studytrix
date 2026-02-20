import { create } from "zustand";

import { getDefaultSettingsMap, getSettingDefinition } from "./settings.registry";
import { getAllSettings, removeSetting, resetSettings, setSetting } from "./settings.service";
import { validateSetting } from "./settings.validation";

export interface SettingsState {
  values: Record<string, unknown>;
  initialized: boolean;
  setValue: (id: string, value: unknown) => void;
  reset: () => void;
  initialize: () => Promise<void>;
}

const defaultValues = getDefaultSettingsMap();

let initializePromise: Promise<void> | null = null;

export const useSettingsStore = create<SettingsState>((set, get) => ({
  values: { ...defaultValues },
  initialized: false,

  setValue: (id: string, value: unknown) => {
    const definition = getSettingDefinition(id);
    if (!definition) {
      return;
    }

    if (!validateSetting(definition, value)) {
      return;
    }

    const currentValue = get().values[id];
    if (Object.is(currentValue, value)) {
      return;
    }

    set((state) => ({
      values: {
        ...state.values,
        [id]: value,
      },
    }));

    void setSetting(id, value).catch((error) => {
      console.error(`Failed to persist setting '${id}'`, error);
    });
  },

  reset: () => {
    set({
      values: { ...defaultValues },
      initialized: true,
    });

    void resetSettings().catch((error) => {
      console.error("Failed to reset persisted settings", error);
    });
  },

  initialize: async () => {
    if (initializePromise) {
      return initializePromise;
    }

    initializePromise = (async () => {
      const persistedValues = await getAllSettings();
      const mergedValues: Record<string, unknown> = { ...defaultValues };

      // Migrate deprecated "accent_color" to new "theme" setting
      if ("accent_color" in persistedValues) {
        if (!("theme" in persistedValues)) {
          persistedValues.theme = "classic";
          void setSetting("theme", "classic");
        }
        delete persistedValues.accent_color;
        void removeSetting("accent_color");
      }

      // Migrate deprecated next-themes mode setting to curated themes.
      if ("theme_mode" in persistedValues) {
        delete persistedValues.theme_mode;
        void removeSetting("theme_mode");
      }

      for (const [id, value] of Object.entries(persistedValues)) {
        const definition = getSettingDefinition(id);

        if (!definition) {
          continue;
        }

        if (!validateSetting(definition, value)) {
          continue;
        }

        mergedValues[id] = value;
      }

      set({
        values: mergedValues,
        initialized: true,
      });
    })()
      .catch((error) => {
        console.error("Failed to initialize settings store", error);
        set({
          values: { ...defaultValues },
          initialized: true,
        });
      })
      .finally(() => {
        initializePromise = null;
      });

    return initializePromise;
  },
}));
