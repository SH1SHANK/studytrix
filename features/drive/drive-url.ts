import { extractDriveFolderId } from "./drive.parser";

export interface ParsedDriveFolder {
  folderId: string;
  normalizedUrl: string;
}

/**
 * Validates and extracts a canonical Google Drive folder ID and normalized URL from user input.
 */
export function parseDriveFolderUrl(input: string): ParsedDriveFolder | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const folderId = extractDriveFolderId(input);
  if (!folderId) {
    return null;
  }

  return {
    folderId,
    normalizedUrl: normalizeDriveFolderUrl(folderId),
  };
}

/**
 * Constructs the canonical public Google Drive folder URL for a given folder ID.
 */
export function normalizeDriveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId.trim()}`;
}

/**
 * Checks whether an input string contains a parseable Google Drive folder ID.
 */
export function isValidDriveFolderUrl(input: string): boolean {
  return extractDriveFolderId(input) !== null;
}
