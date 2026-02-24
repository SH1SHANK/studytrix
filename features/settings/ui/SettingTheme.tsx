"use client";

import { memo, useState } from "react";
import { useTheme } from "next-themes";

import { ThemeBottomSheet } from "@/features/theme/ui/ThemeBottomSheet";
import { Button } from "@/components/ui/button";
import type { SettingItem } from "@/features/settings/settings.types";
import { getThemeLabel } from "@/features/theme/theme.constants";
import { SettingRowShell } from "./SettingCardShell";
import { getSettingIcon } from "./setting-icons";

type SettingThemeProps = {
  setting: SettingItem;
};

function SettingThemeComponent({ setting }: SettingThemeProps) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <>
      <SettingRowShell
        label={setting.label}
        description={setting.description}
        requiresRestart={setting.requiresRestart}
        icon={getSettingIcon(setting.id)}
        trailing={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-lg px-3 text-xs font-medium"
            onClick={() => setOpen(true)}
          >
            Theme: {getThemeLabel(theme)}
          </Button>
        }
      />
      <ThemeBottomSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

export const SettingTheme = memo(SettingThemeComponent);
