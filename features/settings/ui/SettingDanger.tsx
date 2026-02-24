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
} from "@/components/ui/alert-dialog";
import type { SettingItem } from "@/features/settings/settings.types";
import { SettingRowShell } from "./SettingCardShell";
import { getSettingIcon } from "./setting-icons";

interface SettingDangerProps {
  setting: SettingItem;
  onDangerAction?: (id: string) => Promise<void> | void;
}

function SettingDangerComponent({ setting, onDangerAction }: SettingDangerProps) {
  const [pending, setPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!onDangerAction) {
      return;
    }

    setPending(true);
    try {
      await onDangerAction(setting.id);
      setIsOpen(false);
    } finally {
      setPending(false);
    }
  }, [onDangerAction, setting.id]);

  return (
    <>
      <SettingRowShell
        label={pending ? "Processing..." : setting.label}
        description={setting.description}
        requiresRestart={setting.requiresRestart}
        tone="danger"
        icon={getSettingIcon(setting.id)}
        onClick={() => setIsOpen(true)}
        disabled={pending}
      />
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm action</AlertDialogTitle>
            <AlertDialogDescription>
              This will run <strong>{setting.label}</strong>. This action may not be reversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void handleConfirm();
              }}
              disabled={pending}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const SettingDanger = memo(SettingDangerComponent);
