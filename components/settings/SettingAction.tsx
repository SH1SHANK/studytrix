"use client";

import { memo, useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import type { SettingItem } from "@/features/settings/settings.types";
import { SettingRowShell } from "./SettingCardShell";

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
      label={setting.label}
      description={setting.description}
      requiresRestart={setting.requiresRestart}
      trailing={
        <Button
          type="button"
          size="sm"
          onClick={() => void handleClick()}
          disabled={pending}
          className="w-fit min-w-32"
        >
          {pending ? "Running..." : setting.label}
        </Button>
      }
    />
  );
}

export const SettingAction = memo(SettingActionComponent);
