"use client";

import { memo, useCallback } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSetting } from "@/ui/hooks/useSettings";
import type { SettingItem } from "@/features/settings/settings.types";
import { SettingRowShell } from "./SettingCardShell";
import { getSettingIcon } from "./setting-icons";

interface SettingSelectProps {
  setting: SettingItem;
}

function SettingSelectComponent({ setting }: SettingSelectProps) {
  const [value, setValue] = useSetting(setting.id);

  const selectedValue =
    typeof value === "string" ? value : typeof setting.defaultValue === "string" ? setting.defaultValue : "";
  const selectedLabel =
    (setting.options ?? []).find((option) => option.value === selectedValue)?.label ?? selectedValue;

  const handleChange = useCallback(
    (nextValue: string | null) => {
      if (typeof nextValue === "string") {
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
      icon={getSettingIcon(setting.id)}
      trailing={
        <div className="w-full sm:w-48">
          <Select value={selectedValue} onValueChange={handleChange}>
            <SelectTrigger id={`setting-${setting.id}`} className="h-10 w-full rounded-xl px-3.5 text-sm">
              <SelectValue>{selectedLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(setting.options ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}

export const SettingSelect = memo(SettingSelectComponent);
