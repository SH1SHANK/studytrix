"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/features/storage/storage.quota";
import type { OfflineRecord } from "@/features/storage/storage.types";
import { getFileMetadataWithCache } from "@/features/file/file-metadata.client";

interface LargestFilesListProps {
  files: OfflineRecord[];
  onDelete: (id: string) => Promise<void>;
}

function isFallbackEntityId(record: OfflineRecord): boolean {
  return record.entityId.trim() === record.id.trim();
}

function parseDisplayName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function LargestFilesList({ files, onDelete }: LargestFilesListProps) {
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

  const handleDelete = useCallback(
    async (id: string) => {
      await onDelete(id);
    },
    [onDelete],
  );

  const fileIdsNeedingName = useMemo(
    () =>
      files
        .filter((file) => isFallbackEntityId(file))
        .map((file) => file.id),
    [files],
  );

  useEffect(() => {
    if (fileIdsNeedingName.length === 0) {
      return;
    }

    const controller = new AbortController();

    void (async () => {
      const resolvedEntries = await Promise.all(
        fileIdsNeedingName.map(async (fileId) => {
          try {
            const resolved = await getFileMetadataWithCache(fileId, {
              signal: controller.signal,
            });
            const name = parseDisplayName(resolved.metadata?.name);
            if (!name) {
              return null;
            }

            return [fileId, name] as const;
          } catch {
            return null;
          }
        }),
      );

      if (controller.signal.aborted) {
        return;
      }

      const next = resolvedEntries.filter((entry): entry is readonly [string, string] => entry !== null);
      if (next.length === 0) {
        return;
      }

      setResolvedNames((current) => {
        const merged: Record<string, string> = { ...current };
        for (const [fileId, name] of next) {
          merged[fileId] = name;
        }
        return merged;
      });
    })();

    return () => {
      controller.abort();
    };
  }, [fileIdsNeedingName]);

  const maxSize = files[0]?.size ?? 0;

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/80 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle id="largest-files-title" className="text-base font-semibold text-foreground">
          Largest Offline Files
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No offline files to display.
          </p>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => {
              const pct = maxSize > 0 ? (file.size / maxSize) * 100 : 0;

              return (
                <li
                  key={file.id}
                  className="rounded-xl border border-border/80 bg-muted/70 p-3"
                >
                  <article className="space-y-2">
                    <header className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-1 text-sm font-medium text-foreground">
                        {resolvedNames[file.id] ?? file.entityId}
                      </h3>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </span>
                    </header>

                    <div className="h-2 overflow-hidden rounded-full bg-border/80">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct.toFixed(1)}%`,
                          backgroundColor: "var(--chart-2)",
                        }}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Course: {file.courseCode}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void handleDelete(file.id);
                        }}
                        aria-label={`Delete offline file ${resolvedNames[file.id] ?? file.entityId}`}
                      >
                        <IconTrash className="size-3.5" />
                        Delete
                      </Button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
