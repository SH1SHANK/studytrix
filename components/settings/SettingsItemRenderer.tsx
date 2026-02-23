"use client";

import { memo } from "react";

import { SettingAction } from "./SettingAction";
import { SettingRowShell } from "./SettingCardShell";
import { SettingDanger } from "./SettingDanger";
import { SettingSelect } from "./SettingSelect";
import { SettingSlider } from "./SettingSlider";
import { SettingTheme } from "./SettingTheme";
import { SettingToggle } from "./SettingToggle";
import { SettingStorageLocation } from "./SettingStorageLocation";
import { SettingGreetingPreferences } from "./SettingGreetingPreferences";
import { SettingUserProfile } from "./SettingUserProfile";
import { IntelligenceSettingsSection } from "@/components/intelligence/IntelligenceSettingsSection";
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
  if (setting.id === "storage_location") {
    return <SettingStorageLocation setting={setting} />;
  }
  if (setting.id === "userProfile") {
    return <SettingUserProfile />;
  }
  if (setting.id === "greetingPreferences") {
    return <SettingGreetingPreferences setting={setting} />;
  }
  if (setting.id === "intelligence_smart_search_enabled") {
    return <IntelligenceSettingsSection onDangerAction={onDangerAction} />;
  }
  if (
    setting.id === "intelligence_ocr_enabled"
    || setting.id === "intelligence_duplicate_detection_enabled"
    || setting.id === "intelligence_model_mode"
    || setting.id === "intelligence_model_id"
    || setting.id === "intelligence_cleanup_model_id"
    || setting.id === "intelligence_semantic_weight"
    || setting.id === "intelligence_clear_index"
    || setting.id === "intelligence_clear_model_cache"
  ) {
    return null;
  }

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
