"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconAlertTriangle, IconBug, IconCopy, IconRefresh } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllFileIds } from "@/features/offline/offline.db";
import {
  isOfflineV3Enabled,
  isOfflineV3SwEnabled,
} from "@/features/offline/offline.flags";
import { useStorageLocationStore } from "@/features/offline/offline.storage-location.store";

type OfflineRuntimeDiagnosticsProps = {
  compact?: boolean;
};

function formatRelativeTime(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return "Just now";
  }

  if (ageMs < 5_000) {
    return "Just now";
  }

  const seconds = Math.floor(ageMs / 1_000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function OfflineRuntimeDiagnostics({
  compact = false,
}: OfflineRuntimeDiagnosticsProps) {
  const providerType = useStorageLocationStore((state) => state.providerType);
  const status = useStorageLocationStore((state) => state.status);
  const displayPath = useStorageLocationStore((state) => state.displayPath);

  const [fileIds, setFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = await getAllFileIds();
      setFileIds(ids);
      setUpdatedAt(Date.now());
    } catch {
      setError("Could not read offline file IDs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, providerType, status]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [refresh]);

  const idPreview = useMemo(() => fileIds.slice(0, compact ? 4 : 8), [compact, fileIds]);
  const v3Enabled = isOfflineV3Enabled();
  const v3SwEnabled = isOfflineV3SwEnabled();
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const snapshot = useMemo(
    () => ({
      providerType,
      status,
      displayPath,
      online,
      offlineV3Enabled: v3Enabled,
      offlineV3SwEnabled: v3SwEnabled,
      countedFileIds: fileIds.length,
      sampleFileIds: idPreview,
      updatedAt,
      updatedAtIso: updatedAt > 0 ? new Date(updatedAt).toISOString() : null,
    }),
    [
      displayPath,
      fileIds.length,
      idPreview,
      online,
      providerType,
      status,
      updatedAt,
      v3Enabled,
      v3SwEnabled,
    ],
  );

  const copyDiagnostics = useCallback(async () => {
    try {
      const text = JSON.stringify(snapshot, null, 2);
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyStatus("copied");
        window.setTimeout(() => setCopyStatus("idle"), 1800);
        return;
      }

      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  }, [snapshot]);

  return (
    <Card className="rounded-xl border border-border/80 bg-card/80 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <IconBug className="size-4 text-primary" />
            Offline Runtime Diagnostics
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => {
                void copyDiagnostics();
              }}
            >
              <IconCopy className="size-3.5" />
              {copyStatus === "copied"
                ? "Copied"
                : copyStatus === "failed"
                  ? "Copy failed"
                  : "Copy JSON"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => {
                void refresh();
              }}
              disabled={loading}
            >
              <IconRefresh className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
          <span>Provider</span>
          <span className="font-medium text-foreground">{providerType}</span>
          <span>Status</span>
          <span className="font-medium text-foreground">{status}</span>
          <span>Online</span>
          <span className="font-medium text-foreground">{online ? "yes" : "no"}</span>
          <span>Offline v3</span>
          <span className="font-medium text-foreground">{v3Enabled ? "enabled" : "disabled"}</span>
          <span>Offline v3 SW</span>
          <span className="font-medium text-foreground">{v3SwEnabled ? "enabled" : "disabled"}</span>
          <span>Counted file IDs</span>
          <span className="font-medium text-foreground">{fileIds.length}</span>
          <span>Last refresh</span>
          <span className="font-medium text-foreground">
            {updatedAt > 0 ? formatRelativeTime(updatedAt) : "Never"}
          </span>
        </div>

        {displayPath ? (
          <p className="truncate text-muted-foreground" title={displayPath}>
            Location: <span className="font-medium text-foreground">{displayPath}</span>
          </p>
        ) : null}

        {idPreview.length > 0 ? (
          <div className="space-y-1">
            <p className="text-muted-foreground">Sample IDs</p>
            <div className="flex flex-wrap gap-1">
              {idPreview.map((fileId) => (
                <span
                  key={fileId}
                  className="rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                  title={fileId}
                >
                  {fileId}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-100/40 px-2 py-1.5 text-[11px] text-amber-800">
            <IconAlertTriangle className="size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
