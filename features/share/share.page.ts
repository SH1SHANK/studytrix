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

type ShareDriveFolderOptions = {
  folderId: string;
  title?: string;
  text?: string;
};

type PageSharePreference = "native_share" | "copy_link";
const DEPARTMENT_SEGMENT_PATTERN = /^[A-Z]{2,5}$/i;
const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

function resolvePageSharePreference(raw: unknown): PageSharePreference {
  return raw === "copy_link" ? "copy_link" : "native_share";
}

function getPageSharePreference(): PageSharePreference {
  const raw = useSettingsStore.getState().values.page_share_preference;
  return resolvePageSharePreference(raw);
}

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseSemesterValue(value: string | null | undefined): string | null {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized.match(/\d+/)?.[0] ?? normalized, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    return null;
  }

  return String(parsed);
}

function isAcademicFolderRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 3) {
    return false;
  }

  const department = decodeURIComponent(segments[0]).trim();
  const semester = parseSemesterValue(decodeURIComponent(segments[1]).trim());
  return DEPARTMENT_SEGMENT_PATTERN.test(department) && semester !== null;
}

export function sanitizeShareUrl(
  rawUrl: string,
  options: Pick<SharePageOptions, "department" | "semester"> = {},
): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(rawUrl, window.location.origin);
  url.hash = "";

  const cleanParams = new URLSearchParams();

  if (url.pathname === "/") {
    const departmentFromOption = normalizeString(options.department)?.toUpperCase();
    const departmentFromUrl = normalizeString(url.searchParams.get("department"))?.toUpperCase();
    const department = departmentFromOption ?? departmentFromUrl;

    if (department && DEPARTMENT_SEGMENT_PATTERN.test(department)) {
      cleanParams.set("department", department);
    }

    const semesterFromOption = Number.isInteger(options.semester)
      ? String(options.semester)
      : null;
    const semester = parseSemesterValue(semesterFromOption ?? url.searchParams.get("semester"));
    if (semester) {
      cleanParams.set("semester", semester);
    }
  } else if (isAcademicFolderRoute(url.pathname)) {
    const name = normalizeString(url.searchParams.get("name"));
    if (name) {
      cleanParams.set("name", name);
    }
  }

  url.search = cleanParams.toString();
  return url.toString();
}

export function resolveDriveFolderLink(folderId: string | null | undefined): string | null {
  const normalized = normalizeString(folderId);
  if (!normalized) {
    return null;
  }

  if (!DRIVE_FOLDER_ID_PATTERN.test(normalized)) {
    return null;
  }

  return `https://drive.google.com/drive/folders/${encodeURIComponent(normalized)}`;
}

function buildShareUrl(options: SharePageOptions): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = options.url ?? window.location.href;
  return sanitizeShareUrl(raw, options);
}

async function writeClipboardWithFallback(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
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
    if (await writeClipboardWithFallback(url)) {
      toast.success("Page link copied.");
      return;
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

  if (await writeClipboardWithFallback(url)) {
    toast.success("Page link copied.");
    return;
  }

  toast.error("Could not share this page on your device.");
}

export async function copyCurrentPageLink(options: SharePageOptions = {}): Promise<void> {
  const url = buildShareUrl(options);
  if (!url) {
    toast.error("Could not prepare this page link.");
    return;
  }

  if (await writeClipboardWithFallback(url)) {
    toast.success("Page link copied.");
    return;
  }

  toast.error("Could not copy page link.");
}

export async function shareDriveFolderLink(options: ShareDriveFolderOptions): Promise<void> {
  const url = resolveDriveFolderLink(options.folderId);
  if (!url) {
    toast.error("Could not resolve a Drive link for this folder.");
    return;
  }

  const title = options.title ?? "Studytrix";
  const text = options.text ?? "Open this folder in Google Drive";
  const preference = getPageSharePreference();

  if (preference === "copy_link") {
    if (await writeClipboardWithFallback(url)) {
      toast.success("Drive folder link copied.");
      return;
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

  if (await writeClipboardWithFallback(url)) {
    toast.success("Drive folder link copied.");
    return;
  }

  toast.error("Could not share this Drive folder link on your device.");
}

export async function copyDriveFolderLink(folderId: string): Promise<void> {
  const url = resolveDriveFolderLink(folderId);
  if (!url) {
    toast.error("Could not resolve a Drive link for this folder.");
    return;
  }

  if (await writeClipboardWithFallback(url)) {
    toast.success("Drive folder link copied.");
    return;
  }

  toast.error("Could not copy Drive folder link.");
}
