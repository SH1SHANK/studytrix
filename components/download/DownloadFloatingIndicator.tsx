"use client";

import { IconDownload } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { useDownloadManager } from "@/ui/hooks/useDownloadManager";

export function DownloadFloatingIndicator() {
  const { activeCount, openDrawer } = useDownloadManager();

  if (activeCount <= 0) {
    return null;
  }

  return (
    <div aria-live="polite" aria-atomic="true">
      <Button
        type="button"
        variant="outline"
        onClick={openDrawer}
        aria-label={`Open downloads (${activeCount} active)`}
      >
        <IconDownload />
        {activeCount}
      </Button>
    </div>
  );
}
