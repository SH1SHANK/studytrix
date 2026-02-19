"use client";

import { memo, useCallback } from "react";

import { Input } from "@/components/ui/input";
import { useSetting } from "@/ui/hooks/useSettings";
import type { SettingItem } from "@/features/settings/settings.types";
import { SettingRowShell } from "./SettingCardShell";

interface SettingColorProps {
  setting: SettingItem;
}

function SettingColorComponent({ setting }: SettingColorProps) {
  const [value, setValue] = useSetting(setting.id);

  const colorValue =
    typeof value === "string"
      ? value
      : typeof setting.defaultValue === "string"
        ? setting.defaultValue
        : "#000000";

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.currentTarget.value);
    },
    [setValue],
  );

  return (
    <SettingRowShell
      label={setting.label}
      description={setting.description}
      requiresRestart={setting.requiresRestart}
      trailing={
        <div className="flex items-center gap-2">
          <output className="font-mono text-[13px] text-stone-500">{colorValue}</output>
          <div className="relative size-8 overflow-hidden rounded-full shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <Input
              id={`setting-${setting.id}`}
              type="color"
              value={colorValue}
              onChange={handleChange}
              aria-label={setting.label}
              className="absolute -inset-2 size-12 cursor-pointer border-0 p-0"
            />
          </div>
        </div>
      }
    />
  );
}

export const SettingColor = memo(SettingColorComponent);
