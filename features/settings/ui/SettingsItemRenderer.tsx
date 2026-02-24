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
import {
  IntelligenceExperimentalNoticeRow,
  IntelligenceIndexStatusRow,
  IntelligenceLearnMoreRow,
  IntelligenceModelStatusRow,
  IntelligenceRemoveModelRow,
} from "@/features/intelligence/ui/IntelligenceSettingsRows";
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

  if (setting.id === "semantic_search_index_status") {
    return <IntelligenceIndexStatusRow onAction={onAction} onDangerAction={onDangerAction} />;
  }
  if (setting.id === "semantic_search_model_status") {
    return <IntelligenceModelStatusRow />;
  }
  if (setting.id === "semantic_search_remove_model") {
    return <IntelligenceRemoveModelRow onDangerAction={onDangerAction} />;
  }
  if (setting.id === "semantic_search_learn_more") {
    return <IntelligenceLearnMoreRow />;
  }
  if (setting.id === "semantic_search_experimental_notice") {
    return <IntelligenceExperimentalNoticeRow />;
  }

  // Internal state flag; never render in settings UI.
  if (setting.id === "semantic_search_notice_dismissed") {
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
