"use client";

import { useRouter } from "next/navigation";
import { Clock, FileText, ExternalLink, Files, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecentFiles } from "@/hooks/useRecentFiles";
import { openLocalFirst } from "@/features/offline/offline.access";
import { formatFileSize, getMimeLabel } from "@/features/drive/drive.types";
import { EmptyState } from "@/components/ui/empty-state";
import { FileRowSkeleton } from "@/components/ui/skeleton-layouts";

export function RecentFilesView() {
  const router = useRouter();
  const { recentFiles, loading } = useRecentFiles(24);

  const handleOpenFile = async (fileId: string, webViewUrl: string | null) => {
    try {
      const opened = await openLocalFirst(fileId, webViewUrl || undefined);
      if (!opened && webViewUrl) {
        window.open(webViewUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      if (webViewUrl) {
        window.open(webViewUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  if (loading && recentFiles.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
        {Array.from({ length: 6 }).map((_, i) => (
          <FileRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (recentFiles.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Your recent files will appear here"
        description="Open any study document or lecture note from your workspaces or All Files to see it in your study history."
        primaryAction={{
          label: "Browse All Files",
          icon: Files,
          onClick: () => {
            router.push("/files");
          },
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Recently Opened
          </h2>
          <p className="text-xs text-muted-foreground">
            {recentFiles.length} {recentFiles.length === 1 ? "document" : "documents"} in your study history
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card overflow-hidden">
        {recentFiles.map((file) => {
          const sizeLabel = formatFileSize(file.size);
          const mimeLabel = getMimeLabel(file.mimeType, file.name);
          const metaString = [sizeLabel, mimeLabel, file.path].filter(Boolean).join(" · ");
          const openedTime = file.lastOpenedAt
            ? new Date(file.lastOpenedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : null;

          return (
            <div
              key={file.id}
              onClick={() => void handleOpenFile(file.driveFileId, file.webViewUrl)}
              className="flex items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/40 cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {file.name}
                  </h4>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {metaString}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {file.contentStatus === "downloaded" ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="size-3" />
                    Offline Ready
                  </span>
                ) : null}

                {openedTime ? (
                  <span className="hidden sm:inline text-[11px] text-muted-foreground/70">
                    Opened {openedTime}
                  </span>
                ) : null}

                {file.webViewUrl ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(file.webViewUrl!, "_blank", "noopener,noreferrer");
                    }}
                    className="size-7 text-muted-foreground hover:text-foreground"
                    title="Open in Google Drive"
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
