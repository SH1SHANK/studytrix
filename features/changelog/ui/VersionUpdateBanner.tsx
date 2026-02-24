"use client";

import { useEffect, useState } from "react";
import { IconBellRinging, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  CHANGELOG_ENTRIES,
  getChangelogByVersion,
} from "@/features/changelog/changelog.catalog";
import {
  APP_VERSION,
  APP_VERSION_DISMISS_KEY,
  CHANGELOG_ROUTE,
  formatVersionLabel,
} from "@/features/version/version";

export function VersionUpdateBanner() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const latestEntry = getChangelogByVersion(APP_VERSION) ?? CHANGELOG_ENTRIES[0];

  useEffect(() => {
    try {
      const dismissedVersion = window.localStorage.getItem(APP_VERSION_DISMISS_KEY);
      setVisible(dismissedVersion !== APP_VERSION);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible || !latestEntry) {
    return null;
  }

  return (
    <div className="mt-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
          <IconBellRinging className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Updated to {formatVersionLabel(APP_VERSION)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {latestEntry.summary}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-md px-2.5 text-xs"
              onClick={() => {
                router.push(CHANGELOG_ROUTE);
              }}
            >
              View Changelog
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-md px-2.5 text-xs"
              onClick={() => {
                try {
                  window.localStorage.setItem(APP_VERSION_DISMISS_KEY, APP_VERSION);
                } catch {
                  // ignore storage failures
                }
                setVisible(false);
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss version update banner"
          className="mt-0.5 shrink-0 rounded-md"
          onClick={() => {
            try {
              window.localStorage.setItem(APP_VERSION_DISMISS_KEY, APP_VERSION);
            } catch {
              // ignore storage failures
            }
            setVisible(false);
          }}
        >
          <IconX className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
