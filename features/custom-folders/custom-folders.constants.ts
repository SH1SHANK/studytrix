export type PersonalRepositorySwatch = {
  id: string;
  label: string;
  value: string;
};

export const PERSONAL_REPOSITORY_SWATCHES: readonly PersonalRepositorySwatch[] = [
  {
    id: "primary",
    label: "Primary",
    value: "hsl(var(--primary))",
  },
  {
    id: "amber",
    label: "Amber",
    value: "color-mix(in oklab, hsl(40 94% 54%) 80%, var(--background))",
  },
  {
    id: "green",
    label: "Green",
    value: "color-mix(in oklab, hsl(145 70% 42%) 80%, var(--background))",
  },
  {
    id: "rose",
    label: "Rose",
    value: "color-mix(in oklab, hsl(342 78% 46%) 80%, var(--background))",
  },
  {
    id: "blue",
    label: "Blue",
    value: "color-mix(in oklab, hsl(217 88% 54%) 80%, var(--background))",
  },
  {
    id: "purple",
    label: "Purple",
    value: "color-mix(in oklab, hsl(271 81% 55%) 80%, var(--background))",
  },
];

export const PERSONAL_REPOSITORY_STORAGE_KEY = "studytrix_personal_repository";
export const PERSONAL_REPOSITORY_TABS_STORAGE_KEY = "studytrix_personal_repository_tabs";

export const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{28,44}$/;

const DRIVE_FOLDER_LINK_PATTERNS = [
  /drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]{10,})/i,
  /drive\.google\.com\/drive\/u\/\d+\/folders\/([A-Za-z0-9_-]{10,})/i,
  /drive\.google\.com\/open\?id=([A-Za-z0-9_-]{10,})/i,
  /[?&]id=([A-Za-z0-9_-]{10,})/i,
];

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export function normalizeDriveFolderInput(rawValue: string): string | null {
  const normalized = normalizeWhitespace(rawValue);
  if (!normalized) {
    return null;
  }

  if (DRIVE_FOLDER_ID_PATTERN.test(normalized)) {
    return normalized;
  }

  for (const pattern of DRIVE_FOLDER_LINK_PATTERNS) {
    const match = normalized.match(pattern);
    const maybeId = match?.[1]?.trim();
    if (maybeId && DRIVE_FOLDER_ID_PATTERN.test(maybeId)) {
      return maybeId;
    }
  }

  return null;
}

export function getPersonalRepositoryErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case "FOLDER_NOT_FOUND":
      return "This folder doesn't exist or has been deleted.";
    case "ACCESS_DENIED":
      return "Access denied. Share the folder with 'Anyone with the link' and try again.";
    case "INVALID_ID":
      return "This doesn't appear to be a valid Drive folder.";
    case "DRIVE_ERROR":
    default:
      return "Couldn't reach Google Drive. Check your connection and try again.";
  }
}
