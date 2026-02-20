"use client";

import { memo, useCallback, useState } from "react";

import type { SettingItem } from "@/features/settings/settings.types";
import { SettingRowShell } from "./SettingCardShell";
import { getSettingIcon } from "./setting-icons";

interface SettingActionProps {
  setting: SettingItem;
  onAction?: (id: string) => Promise<void> | void;
}

function SettingActionComponent({ setting, onAction }: SettingActionProps) {
  const [pending, setPending] = useState(false);

  const handleClick = useCallback(async () => {
    if (!onAction) {
      return;
    }

    setPending(true);
    try {
      await onAction(setting.id);
    } finally {
      setPending(false);
    }
  }, [onAction, setting.id]);

  return (
    <SettingRowShell
      label={pending ? "Running..." : setting.label}
      description={setting.description}
      requiresRestart={setting.requiresRestart}
      icon={getSettingIcon(setting.id)}
      onClick={() => void handleClick()}
      disabled={pending}
    />
  );
}

export const SettingAction = memo(SettingActionComponent);
