"use client";

export const PERSONAL_ROOT_FOLDER_ID = "personal_root";
export const PERSONAL_ROOT_LABEL = "Root Directory";
export const LEGACY_UNSORTED_CAPTURES_ID = "unsorted_captures";

export function isPersonalRootFolderId(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim();
  return (
    normalized.length === 0
    || normalized === PERSONAL_ROOT_FOLDER_ID
    || normalized === LEGACY_UNSORTED_CAPTURES_ID
  );
}

export function normalizePersonalFolderId(value: string | null | undefined): string {
  const normalized = (value ?? "").trim();
  if (isPersonalRootFolderId(normalized)) {
    return PERSONAL_ROOT_FOLDER_ID;
  }
  return normalized;
}
