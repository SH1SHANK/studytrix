export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  isFolder: boolean;
  webViewLink: string | null;
  iconLink: string | null;
}

export interface DriveFolderContents {
  items: DriveItem[];
  nextPageToken?: string;
}

export const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

export function isDriveFolder(item: DriveItem): boolean {
  return item.isFolder || item.mimeType === DRIVE_FOLDER_MIME;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDriveItem(value: unknown): value is DriveItem {
  if (!isRecord(value)) {
    return false;
  }

  const { id, name, mimeType, size, modifiedTime, isFolder, webViewLink, iconLink } = value;

  return (
    typeof id === "string" &&
    id.length > 0 &&
    typeof name === "string" &&
    name.length > 0 &&
    typeof mimeType === "string" &&
    mimeType.length > 0 &&
    (size === null || (typeof size === "number" && Number.isFinite(size) && size >= 0)) &&
    (modifiedTime === null || typeof modifiedTime === "string") &&
    typeof isFolder === "boolean" &&
    (webViewLink === null || typeof webViewLink === "string") &&
    (iconLink === null || typeof iconLink === "string")
  );
}

export function isDriveFolderContents(value: unknown): value is DriveFolderContents {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return false;
  }

  if (
    value.nextPageToken !== undefined &&
    typeof value.nextPageToken !== "string"
  ) {
    return false;
  }

  return value.items.every(isDriveItem);
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) {
    return "";
  }

  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

const DRIVE_MIME_LABELS: Record<string, string> = {
  "application/vnd.google-apps.document": "Google Doc",
  "application/vnd.google-apps.spreadsheet": "Google Sheet",
  "application/vnd.google-apps.presentation": "Google Slides",
  "application/vnd.google-apps.form": "Google Form",
  "application/vnd.google-apps.drawing": "Google Drawing",
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "video/mp4": "MP4",
  "application/zip": "ZIP",
};

export function getMimeLabel(mimeType: string, filename: string): string {
  if (DRIVE_MIME_LABELS[mimeType]) {
    return DRIVE_MIME_LABELS[mimeType];
  }

  const extension = getFileExtension(filename).toUpperCase();
  return extension || "File";
}

/**
 * Maps remoteStatus and contentStatus to clear, human-readable UI status labels
 * preserving the critical distinction between remote source availability and local content cache.
 */
export function getHumanReadableContentStatus(
  remoteStatus: "available" | "deleted" | "unavailable",
  contentStatus: "not-downloaded" | "downloading" | "downloaded" | "indexed" | "error",
): {
  label: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive" | "success" | "warning";
  isOfflineAvailable: boolean;
} {
  // Remote deleted, but downloaded copy exists locally
  if (remoteStatus === "deleted" && (contentStatus === "downloaded" || contentStatus === "indexed")) {
    return {
      label: "Source removed · Available offline",
      badgeVariant: "secondary",
      isOfflineAvailable: true,
    };
  }

  // Remote deleted and no local copy
  if (remoteStatus === "deleted") {
    return {
      label: "Source removed",
      badgeVariant: "destructive",
      isOfflineAvailable: false,
    };
  }

  // Remote temporarily unavailable
  if (remoteStatus === "unavailable") {
    if (contentStatus === "downloaded" || contentStatus === "indexed") {
      return {
        label: "Available offline",
        badgeVariant: "success",
        isOfflineAvailable: true,
      };
    }
    return {
      label: "Source unavailable",
      badgeVariant: "destructive",
      isOfflineAvailable: false,
    };
  }

  // Remote is available: show local content cache status
  switch (contentStatus) {
    case "downloaded":
      return {
        label: "Available offline",
        badgeVariant: "success",
        isOfflineAvailable: true,
      };
    case "indexed":
      return {
        label: "Ready offline",
        badgeVariant: "success",
        isOfflineAvailable: true,
      };
    case "downloading":
      return {
        label: "Downloading…",
        badgeVariant: "warning",
        isOfflineAvailable: false,
      };
    case "error":
      return {
        label: "Download failed",
        badgeVariant: "destructive",
        isOfflineAvailable: false,
      };
    case "not-downloaded":
    default:
      return {
        label: "Online only",
        badgeVariant: "outline",
        isOfflineAvailable: false,
      };
  }
}
