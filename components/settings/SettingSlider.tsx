"use client";

import { memo, useCallback } from "react";

import { Slider } from "@/components/ui/slider";
import { useSetting } from "@/ui/hooks/useSettings";
import type { SettingItem } from "@/features/settings/settings.types";
import { SettingRowShell } from "./SettingCardShell";

interface SettingSliderProps {
  setting: SettingItem;
}

function SettingSliderComponent({ setting }: SettingSliderProps) {
  const [value, setValue] = useSetting(setting.id);

  const min = setting.min ?? 0;
  const max = setting.max ?? 100;
  const step = setting.step ?? 1;

  const numericValue =
    typeof value === "number"
      ? value
      : typeof setting.defaultValue === "number"
        ? setting.defaultValue
        : min;

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.currentTarget.value);
      if (Number.isFinite(nextValue)) {
        setValue(nextValue);
      }
    },
    [setValue],
  );

  return (
    <SettingRowShell
      label={setting.label}
      description={setting.description}
      requiresRestart={setting.requiresRestart}
      trailing={
        <div className="flex w-full items-center gap-4 sm:w-auto">
          <div className="w-full sm:w-40 flex items-center">
            <Slider
              id={`setting-${setting.id}`}
              min={min}
              max={max}
              step={step}
              value={numericValue}
              onChange={handleChange}
              aria-label={setting.label}
              className="h-2.5"
            />
          </div>
          <output className="w-8 text-right font-mono text-sm text-stone-500">
            {numericValue}
          </output>
        </div>
      }
    />
  );
}

export const SettingSlider = memo(SettingSliderComponent);
