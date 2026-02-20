"use client";

import { memo } from "react";

import { SettingAction } from "./SettingAction";
import { SettingRowShell } from "./SettingCardShell";
import { SettingDanger } from "./SettingDanger";
import { SettingSelect } from "./SettingSelect";
import { SettingSlider } from "./SettingSlider";
import { SettingTheme } from "./SettingTheme";
import { SettingToggle } from "./SettingToggle";
import { getSettingIcon } from "./setting-icons";
import type { SettingItem } from "@/features/settings/settings.types";

interface SettingsItemRendererProps {
  setting: SettingItem;
  onAction?: (id: string) => Promise<void> | void;
  onDangerAction?: (id: string) => Promise<void> | void;
}

function SettingsItemRendererComponent({
  setting,
  onAction,
  onDangerAction,
}: SettingsItemRendererProps) {
  if (setting.type === "toggle") {
    return <SettingToggle setting={setting} />;
  }

  if (setting.type === "select") {
    return <SettingSelect setting={setting} />;
  }

  if (setting.type === "slider") {
    return <SettingSlider setting={setting} />;
  }

  if (setting.type === "theme") {
    return <SettingTheme setting={setting} />;
  }

  if (setting.type === "action") {
    return <SettingAction setting={setting} onAction={onAction} />;
  }

  if (setting.type === "danger") {
    return <SettingDanger setting={setting} onDangerAction={onDangerAction} />;
  }

  return <SettingRowShell label={setting.label} description={setting.description} requiresRestart={setting.requiresRestart} icon={getSettingIcon(setting.id)} />;
}

export const SettingsItemRenderer = memo(SettingsItemRendererComponent);
