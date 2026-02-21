"use client";

import { useCallback, useSyncExternalStore } from "react";
import { toast } from "sonner";

import {
  assessDownloadRisk,
  buildDownloadRiskConfirmDescription,
  buildDownloadRiskWarningMessage,
  type DownloadRiskItem,
  type DownloadRiskSummary,
} from "@/features/download/download.risk";

type DownloadRiskGateOptions = {
  actionLabel?: string;
  warningMessage?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  confirmButtonLabel?: string;
};

type DownloadRiskDialogSnapshot = {
  open: boolean;
  summary: DownloadRiskSummary | null;
  title: string;
  description: string;
  confirmButtonLabel: string;
  resolver: ((confirmed: boolean) => void) | null;
};

const DEFAULT_SNAPSHOT: DownloadRiskDialogSnapshot = {
  open: false,
  summary: null,
  title: "Confirm download",
  description: "",
  confirmButtonLabel: "Continue",
  resolver: null,
};

let snapshot: DownloadRiskDialogSnapshot = DEFAULT_SNAPSHOT;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setSnapshot(next: DownloadRiskDialogSnapshot): void {
  snapshot = next;
  notifyListeners();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): DownloadRiskDialogSnapshot {
  return snapshot;
}

function buildDialogTitle(options?: DownloadRiskGateOptions): string {
  if (options?.confirmTitle && options.confirmTitle.trim().length > 0) {
    return options.confirmTitle.trim();
  }

  const action = options?.actionLabel?.trim() || "download";
  return `Confirm ${action}`;
}

function openRiskConfirmation(
  summary: DownloadRiskSummary,
  options?: DownloadRiskGateOptions,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const title = buildDialogTitle(options);
    const description = options?.confirmDescription?.trim() || buildDownloadRiskConfirmDescription(summary);
    const confirmButtonLabel = options?.confirmButtonLabel?.trim() || "Continue";

    setSnapshot({
      open: true,
      summary,
      title,
      description,
      confirmButtonLabel,
      resolver: resolve,
    });
  });
}

export function resolveDownloadRiskDialog(confirmed: boolean): void {
  const resolver = snapshot.resolver;
  setSnapshot(DEFAULT_SNAPSHOT);
  resolver?.(confirmed);
}

export function useDownloadRiskDialogState(): DownloadRiskDialogSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useDownloadRiskGate() {
  return useCallback(async (
    items: DownloadRiskItem[],
    options?: DownloadRiskGateOptions,
  ): Promise<boolean> => {
    const summary = assessDownloadRisk(items);

    if (summary.tier === "none") {
      return true;
    }

    const warningMessage = options?.warningMessage ?? buildDownloadRiskWarningMessage(summary);
    if (warningMessage) {
      toast.warning(warningMessage, { duration: 6000 });
    }

    if (summary.tier === "warn") {
      return true;
    }

    return await openRiskConfirmation(summary, options);
  }, []);
}

export type { DownloadRiskGateOptions, DownloadRiskItem };
