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

export const PERSONAL_REPOSITORY_STORAGE_KEY = "studytrix_personal_repository_v2";
export const PERSONAL_REPOSITORY_TABS_STORAGE_KEY = "studytrix_personal_repository_tabs_v2";

export const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{25,50}$/;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const DEFAULT_STUDYTRIX_SHARE_ORIGIN = "https://studytrix.app";

const DRIVE_FOLDER_LINK_PATTERNS = [
  /drive\.google\.com\/drive\/folders\/([A-Za-z0-9_-]{10,})/i,
  /drive\.google\.com\/drive\/u\/\d+\/folders\/([A-Za-z0-9_-]{10,})/i,
  /drive\.google\.com\/open\?id=([A-Za-z0-9_-]{10,})/i,
  /[?&]id=([A-Za-z0-9_-]{10,})/i,
];

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

function toBase64Url(value: string): string | null {
  const normalized = value.trim();
  if (!normalized || !DRIVE_FOLDER_ID_PATTERN.test(normalized)) {
    return null;
  }

  try {
    const maybeBuffer = (globalThis as { Buffer?: { from: (input: string, encoding?: string) => { toString: (encoding?: string) => string } } }).Buffer;
    let base64 = "";
    if (typeof btoa === "function") {
      base64 = btoa(normalized);
    } else if (maybeBuffer) {
      base64 = maybeBuffer.from(normalized, "utf8").toString("base64");
    } else {
      return null;
    }

    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  } catch {
    return null;
  }
}

function fromBase64Url(value: string): string | null {
  const normalized = value.trim();
  if (!normalized || !BASE64_URL_PATTERN.test(normalized)) {
    return null;
  }

  const padded = normalized
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const maybeBuffer = (globalThis as { Buffer?: { from: (input: string, encoding?: string) => { toString: (encoding?: string) => string } } }).Buffer;
    let decoded = "";
    if (typeof atob === "function") {
      decoded = atob(padded);
    } else if (maybeBuffer) {
      decoded = maybeBuffer.from(padded, "base64").toString("utf8");
    } else {
      return null;
    }

    const folderId = decoded.trim();
    return DRIVE_FOLDER_ID_PATTERN.test(folderId) ? folderId : null;
  } catch {
    return null;
  }
}

function parseImportLink(rawValue: string): string | null {
  const normalized = normalizeWhitespace(rawValue);
  if (!normalized) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(normalized)
    ? normalized
    : normalized.startsWith("studytrix.app/")
      ? `https://${normalized}`
      : normalized.startsWith("www.studytrix.app/")
        ? `https://${normalized}`
        : null;

  if (!withProtocol) {
    return null;
  }

  try {
    const url = new URL(withProtocol);
    if (!url.pathname.startsWith("/import")) {
      return null;
    }

    const fid = url.searchParams.get("fid");
    if (!fid) {
      return null;
    }

    return fromBase64Url(fid);
  } catch {
    return null;
  }
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

export function normalizeImportFolderInput(rawValue: string): string | null {
  const fromShareLink = parseImportLink(rawValue);
  if (fromShareLink) {
    return fromShareLink;
  }

  return normalizeDriveFolderInput(rawValue);
}

export function decodeSharedFolderId(rawFid: string): string | null {
  return fromBase64Url(rawFid);
}

export function buildFolderImportShareLink(folderId: string, origin?: string): string | null {
  const fid = toBase64Url(folderId);
  if (!fid) {
    return null;
  }

  const baseOrigin = origin?.trim() || DEFAULT_STUDYTRIX_SHARE_ORIGIN;
  try {
    const url = new URL(baseOrigin);
    url.pathname = "/import";
    url.searchParams.set("fid", fid);
    url.searchParams.set("ref", "share");
    return url.toString();
  } catch {
    return `${DEFAULT_STUDYTRIX_SHARE_ORIGIN}/import?fid=${fid}&ref=share`;
  }
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
