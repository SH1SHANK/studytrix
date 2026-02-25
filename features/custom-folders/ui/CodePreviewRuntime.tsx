"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CodePreviewSheet } from "@/features/custom-folders/ui/CodePreviewSheet";
import { onCodePreviewRequest, type CodePreviewRequest } from "@/features/custom-folders/code-preview.events";
import { startDownload } from "@/features/download/download.controller";
import { useDownloadStore } from "@/features/download/download.store";

export function CodePreviewRuntime() {
  const [request, setRequest] = useState<CodePreviewRequest | null>(null);
  const openDrawer = useDownloadStore((state) => state.openDrawer);

  useEffect(() => onCodePreviewRequest((nextRequest) => {
    setRequest(nextRequest);
  }), []);

  return (
    <CodePreviewSheet
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) {
          setRequest(null);
        }
      }}
      fileId={request?.fileId ?? null}
      fileName={request?.fileName ?? ""}
      extension={request?.extension ?? ""}
      onRequestDownload={(fileId) => {
        void startDownload(fileId).then((taskId) => {
          if (taskId) {
            openDrawer();
          } else {
            toast.error("Could not start download.");
          }
        }).catch(() => {
          toast.error("Could not start download.");
        });
      }}
    />
  );
}
