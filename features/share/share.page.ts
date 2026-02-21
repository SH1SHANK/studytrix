"use client";

import { toast } from "sonner";
import { useSettingsStore } from "@/features/settings/settings.store";

type SharePageOptions = {
  title?: string;
  text?: string;
  url?: string;
  department?: string;
  semester?: number;
};

type PageSharePreference = "native_share" | "copy_link";

function resolvePageSharePreference(raw: unknown): PageSharePreference {
  return raw === "copy_link" ? "copy_link" : "native_share";
}

function getPageSharePreference(): PageSharePreference {
  const raw = useSettingsStore.getState().values.page_share_preference;
  return resolvePageSharePreference(raw);
}

function buildShareUrl(options: SharePageOptions): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = options.url ?? window.location.href;
  const url = new URL(raw, window.location.origin);

  if (url.pathname === "/") {
    if (options.department && !url.searchParams.has("department")) {
      url.searchParams.set("department", options.department);
    }
    if (Number.isInteger(options.semester) && !url.searchParams.has("semester")) {
      url.searchParams.set("semester", String(options.semester));
    }
  }

  return url.toString();
}

export async function shareCurrentPage(options: SharePageOptions = {}): Promise<void> {
  const url = buildShareUrl(options);
  if (!url) {
    toast.error("Could not prepare this page link.");
    return;
  }

  const title = options.title ?? "Studytrix";
  const text = options.text ?? "Open this Studytrix view";
  const preference = getPageSharePreference();

  if (preference === "copy_link") {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Page link copied.");
        return;
      } catch {
        // fallback below
      }
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Page link copied.");
      return;
    } catch {
      // fallback below
    }
  }

  toast.error("Could not share this page on your device.");
}

export async function copyCurrentPageLink(options: SharePageOptions = {}): Promise<void> {
  const url = buildShareUrl(options);
  if (!url) {
    toast.error("Could not prepare this page link.");
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Page link copied.");
      return;
    } catch {
      toast.error("Could not copy page link.");
      return;
    }
  }

  toast.error("Clipboard is not available in this browser.");
}
