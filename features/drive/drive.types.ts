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
