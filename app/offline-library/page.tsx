"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { IconCloudOff, IconFolder, IconRefresh } from "@tabler/icons-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { openLocalFirst } from "@/features/offline/offline.access";
import {
  loadOfflineLibrarySnapshot,
  type OfflineLibrarySnapshot,
} from "@/features/offline/offline.library";

const FILE_PAGE_SIZE = 120;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function OfflineLibraryContent() {
  const searchParams = useSearchParams();
  const selectedFolderId = searchParams.get("folder");
  const [snapshot, setSnapshot] = useState<OfflineLibrarySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleFileCount, setVisibleFileCount] = useState(FILE_PAGE_SIZE);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadOfflineLibrarySnapshot({ force, maxAgeMs: 20_000 });
      setSnapshot(next);
    } catch {
      setError("Could not load offline library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  useEffect(() => {
    setVisibleFileCount(FILE_PAGE_SIZE);
  }, [selectedFolderId, snapshot?.files.length]);

  const visibleFiles = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    if (!selectedFolderId) {
      return snapshot.files;
    }

    return snapshot.files.filter((file) => file.folderId === selectedFolderId);
  }, [selectedFolderId, snapshot]);

  const renderedFiles = useMemo(
    () => visibleFiles.slice(0, visibleFileCount),
    [visibleFiles, visibleFileCount],
  );

  return (
    <AppShell headerTitle="Offline Library" hideHeaderFilters={true}>
      <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-24 sm:px-5">
        <header className="mb-5 space-y-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              Offline folders and files
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use Command Center (`⌘K`) to search offline folders/files instantly.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Folders</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {snapshot?.folders.length ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Files</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {snapshot?.files.length ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">Size</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {formatBytes(snapshot?.totalBytes ?? 0)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void refresh(true)} className="h-8 gap-1.5 rounded-lg text-xs">
              <IconRefresh className="size-3.5" />
              Refresh
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Loading offline library...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-rose-300/50 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {!loading && !error && snapshot && snapshot.files.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <IconCloudOff className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium text-foreground">No offline files yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Save files for offline use to see them here.
            </p>
          </div>
        ) : null}

        {!loading && !error && snapshot && snapshot.files.length > 0 ? (
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                Offline Folders
              </h2>
              <div className="space-y-1.5">
                {snapshot.folders.map((folder) => (
                  <div
                    key={`${folder.folderId}-${folder.path}`}
                    className={`rounded-lg border px-3 py-2 ${
                      selectedFolderId && selectedFolderId === folder.folderId
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          <IconFolder className="mr-1.5 inline size-4 align-[-2px] text-primary" />
                          {folder.path}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {folder.fileCount} file{folder.fileCount > 1 ? "s" : ""} · {formatBytes(folder.totalBytes)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                Offline Files
              </h2>
              <div className="space-y-2">
                {renderedFiles.map((file) => (
                  <div key={file.fileId} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {file.folderPath} · {formatBytes(file.size)} · {file.mimeType}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-md px-2 text-xs"
                        onClick={() => {
                          void openLocalFirst(
                            file.fileId,
                            `/api/file/${encodeURIComponent(file.fileId)}/stream`,
                          );
                        }}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {visibleFiles.length > renderedFiles.length ? (
                <div className="mt-3 flex justify-center">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-md px-3 text-xs"
                    onClick={() => setVisibleFileCount((count) => count + FILE_PAGE_SIZE)}
                  >
                    Load more ({visibleFiles.length - renderedFiles.length} remaining)
                  </Button>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

export default function OfflineLibraryPage() {
  return (
    <Suspense
      fallback={
        <AppShell headerTitle="Offline Library" hideHeaderFilters={true}>
          <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-5">
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Loading offline library...
            </div>
          </div>
        </AppShell>
      }
    >
      <OfflineLibraryContent />
    </Suspense>
  );
}
