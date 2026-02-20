"use client";

import { getFile, updateLastAccess } from "./offline.db";

const blobUrlByFileId = new Map<string, string>();

function getFallbackUrl(fileId: string, fallbackUrl?: string): string {
  if (typeof fallbackUrl === "string" && fallbackUrl.trim().length > 0) {
    return fallbackUrl;
  }

  return `/api/file/${encodeURIComponent(fileId)}/stream`;
}

export async function has(fileId: string): Promise<boolean> {
  const record = await getFile(fileId);
  return Boolean(record);
}

export async function getBlob(fileId: string): Promise<Blob | null> {
  const record = await getFile(fileId);
  if (!record) {
    return null;
  }

  await updateLastAccess(fileId);
  return record.blob;
}

export function revoke(fileId: string): void {
  const current = blobUrlByFileId.get(fileId);
  if (!current) {
    return;
  }

  URL.revokeObjectURL(current);
  blobUrlByFileId.delete(fileId);
}

function openInNewTab(url: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const popup = window.open(url, "_blank", "noopener,noreferrer");
  return popup !== null;
}

function openPendingTab(): Window | null {
  if (typeof window === "undefined") {
    return null;
  }

  const popup = window.open("about:blank", "_blank");
  if (!popup) {
    return null;
  }

  try {
    popup.opener = null;
  } catch {
    // Best effort hardening.
  }

  return popup;
}

function navigatePendingTab(popup: Window | null, url: string): boolean {
  if (!popup || popup.closed) {
    return openInNewTab(url);
  }

  try {
    popup.location.replace(url);
    popup.focus();
    return true;
  } catch {
    return openInNewTab(url);
  }
}

export async function openLocalFirst(
  fileId: string,
  fallbackUrl?: string,
): Promise<boolean> {
  const pendingTab = openPendingTab();
  const blob = await getBlob(fileId);

  if (blob) {
    revoke(fileId);
    const localUrl = URL.createObjectURL(blob);
    blobUrlByFileId.set(fileId, localUrl);

    const opened = navigatePendingTab(pendingTab, localUrl);
    if (!opened) {
      revoke(fileId);
      return navigatePendingTab(pendingTab, getFallbackUrl(fileId, fallbackUrl));
    }

    const timer = window.setTimeout(() => {
      revoke(fileId);
    }, 60_000);
    if (typeof timer === "object" && timer !== null && "unref" in timer) {
      (timer as { unref: () => void }).unref();
    }

    return true;
  }

  return navigatePendingTab(pendingTab, getFallbackUrl(fileId, fallbackUrl));
}
