"use client";

import { memo, useCallback } from "react";

import { Switch } from "@/components/ui/switch";
import { useSetting } from "@/ui/hooks/useSettings";
import type { SettingItem } from "@/features/settings/settings.types";
import { SettingRowShell } from "./SettingCardShell";
import { getSettingIcon } from "./setting-icons";

interface SettingToggleProps {
  setting: SettingItem;
}

function SettingToggleComponent({ setting }: SettingToggleProps) {
  const [value, setValue] = useSetting(setting.id);
  const [hapticsEnabled] = useSetting("enable_haptics");
  const checked = typeof value === "boolean" ? value : Boolean(setting.defaultValue);

  const handleChange = useCallback(
    (nextValue: boolean) => {
      setValue(nextValue);
      if (hapticsEnabled && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    },
    [setValue, hapticsEnabled],
  );

  return (
    <SettingRowShell
      label={setting.label}
      description={setting.description}
      requiresRestart={setting.requiresRestart}
      icon={getSettingIcon(setting.id)}
      trailing={
        <Switch
          id={`setting-${setting.id}`}
          checked={checked}
          onCheckedChange={handleChange}
          aria-label={setting.label}
          className="mt-1"
        />
      }
    />
  );
}

export const SettingToggle = memo(SettingToggleComponent);
