"use client";

import { memo, useCallback, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { SettingItem } from "@/features/settings/settings.types";
import { SettingRowShell } from "./SettingCardShell";

interface SettingDangerProps {
  setting: SettingItem;
  onDangerAction?: (id: string) => Promise<void> | void;
}

function SettingDangerComponent({ setting, onDangerAction }: SettingDangerProps) {
  const [pending, setPending] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!onDangerAction) {
      return;
    }

    setPending(true);
    try {
      await onDangerAction(setting.id);
    } finally {
      setPending(false);
    }
  }, [onDangerAction, setting.id]);

  return (
    <SettingRowShell
      label={setting.label}
      description={setting.description}
      requiresRestart={setting.requiresRestart}
      tone="danger"
      trailing={
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button type="button" variant="destructive" size="sm" disabled={pending} className="w-fit min-w-32" />
            }
          >
            {pending ? "Processing..." : setting.label}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm action</AlertDialogTitle>
              <AlertDialogDescription>
                This will run <strong>{setting.label}</strong>. This action may not be reversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  void handleConfirm();
                }}
                disabled={pending}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    />
  );
}

export const SettingDanger = memo(SettingDangerComponent);
