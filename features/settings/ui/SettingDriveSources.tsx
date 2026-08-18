"use client";

import { useState } from "react";
import Link from "next/link";
import { HardDrive, RefreshCw, Plus, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriveSources } from "@/hooks/useDriveSources";
import { driveScanner } from "@/features/drive/drive-scanner";
import { toast } from "sonner";

export function SettingDriveSources() {
  const { sources, loading } = useDriveSources();
  const [scanning, setScanning] = useState(false);

  const handleScanAll = async () => {
    if (scanning || sources.length === 0) return;
    setScanning(true);
    toast.info("Scanning all Drive sources for new files…");
    try {
      await driveScanner.scanAll();
      toast.success("Scan complete! All Drive sources are up to date.");
    } catch {
      toast.error("Drive scan failed. Your local offline files remain available.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">
            Connected Google Drive Folders
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Public Google Drive folders linked as external study content sources.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => void handleScanAll()}
              disabled={scanning}
              className="h-7 text-xs gap-1"
            >
              <RefreshCw className={`size-3 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning…" : "Scan All"}
            </Button>
          )}

          <Link href="/sources">
            <Button type="button" size="xs" className="h-7 text-xs gap-1">
              <Plus className="size-3" />
              Manage Sources
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
          Loading connected sources…
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-4 text-center bg-muted/20">
          <p className="text-xs text-muted-foreground">No Google Drive sources connected yet.</p>
          <Link href="/sources">
            <Button variant="link" size="xs" className="text-xs mt-1 text-primary">
              Connect your first folder
            </Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border/30 rounded-lg border border-border/40 overflow-hidden bg-background/50">
          {sources.map((source) => {
            const timeAgo = source.lastScannedAt
              ? new Date(source.lastScannedAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Never";

            return (
              <div key={source.id} className="flex items-center justify-between p-2.5 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <HardDrive className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-foreground truncate block">{source.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {source.fileCount} files · Scanned {timeAgo}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {source.status === "error" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-500">
                      <AlertCircle className="size-3" /> Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" /> Ready
                    </span>
                  )}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Open on Google Drive"
                  >
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
