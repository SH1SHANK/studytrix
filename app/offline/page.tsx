"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconWifiOff } from "@tabler/icons-react";

import { getMetadataByPrefix } from "@/features/offline/offline.db";

type RecentFile = {
  id: string;
  name: string;
  downloadedAt: number;
};

function parseRecentFile(value: string): RecentFile | null {
  try {
    const parsed = JSON.parse(value) as {
      id?: unknown;
      name?: unknown;
      downloadedAt?: unknown;
      updatedAt?: unknown;
    };

    const id = typeof parsed.id === "string" ? parsed.id.trim() : "";
    const name = typeof parsed.name === "string" ? parsed.name.trim() : id;
    const downloadedAt =
      typeof parsed.downloadedAt === "number" && Number.isFinite(parsed.downloadedAt)
        ? parsed.downloadedAt
        : (typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
          ? parsed.updatedAt
          : 0);

    if (!id) {
      return null;
    }

    return {
      id,
      name: name || id,
      downloadedAt,
    };
  } catch {
    return null;
  }
}

export default function OfflinePage() {
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("studytrix.last_sync_at");
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) {
          setLastSyncAt(parsed);
        }
      }
    } catch {
    }

    void (async () => {
      try {
        const records = await getMetadataByPrefix("download-meta:");
        const parsed = records
          .map((record) => parseRecentFile(record.value))
          .filter((record): record is RecentFile => record !== null)
          .sort((left, right) => right.downloadedAt - left.downloadedAt)
          .slice(0, 5);
        setRecentFiles(parsed);
      } catch {
        setRecentFiles([]);
      }
    })();
  }, []);

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) {
      return "Unknown";
    }

    try {
      return new Date(lastSyncAt).toLocaleString();
    } catch {
      return "Unknown";
    }
  }, [lastSyncAt]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 py-12">
      <div className="w-full rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur-md sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IconWifiOff className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Studytrix</p>
            <h1 className="text-xl font-semibold text-foreground">You're offline</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Live content is unavailable. You can still open files that are already cached.
        </p>

        <div className="mt-4 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Last sync: <span className="font-medium text-foreground">{lastSyncLabel}</span>
        </div>

        <div className="mt-5">
          <h2 className="text-sm font-semibold text-foreground">Recent cached files</h2>
          {recentFiles.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No recent cached files available.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {recentFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/api/file/${encodeURIComponent(file.id)}/stream`}
                  className="block truncate rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-sm text-foreground hover:bg-muted/50"
                >
                  {file.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link
            href="/offline-library.html"
            className="inline-flex items-center rounded-lg bg-foreground px-3.5 py-2 text-sm font-semibold text-background"
          >
            Open Offline Library
          </Link>
        </div>
      </div>
    </main>
  );
}
