"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconDownload } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DOWNLOAD_BUTTON_ELEMENT_ID, useDownloadManager } from "@/ui/hooks/useDownloadManager";

const LONG_PRESS_MS = 500;

type DownloadButtonProps = {
  className?: string;
  compact?: boolean;
};

export function DownloadButton({ className, compact = false }: DownloadButtonProps) {
  const router = useRouter();
  const longPressTimer = useRef<number | null>(null);
  const { activeCount, openDrawer } = useDownloadManager();

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current === null) {
      return;
    }

    window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier || event.key.toLowerCase() !== "j") {
        return;
      }

      event.preventDefault();

      if (event.shiftKey) {
        openDrawer();
        return;
      }

      router.push("/downloads");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openDrawer, router]);

  useEffect(() => {
    return () => {
      clearLongPress();
    };
  }, [clearLongPress]);

  return (
    <Button
      id={DOWNLOAD_BUTTON_ELEMENT_ID}
      type="button"
      variant="outline"
      className={cn(className)}
      aria-label="Open downloads"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey) {
          router.push("/downloads");
          return;
        }

        openDrawer();
      }}
      onPointerDown={() => {
        clearLongPress();
        longPressTimer.current = window.setTimeout(() => {
          router.push("/downloads");
        }, LONG_PRESS_MS);
      }}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
    >
      <IconDownload />
      <span className={compact ? "hidden sm:inline" : undefined}>Downloads</span>
      {activeCount > 0 ? <Badge>{activeCount}</Badge> : null}
    </Button>
  );
}
