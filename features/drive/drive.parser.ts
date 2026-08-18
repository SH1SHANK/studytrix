const FOLDER_ID_REGEX = /^[a-zA-Z0-9_-]{10,256}$/;

/**
 * Extracts a Google Drive folder ID from raw input (URLs, shared links, or raw IDs).
 */
export function extractDriveFolderId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If it's directly a valid folder ID string
  if (FOLDER_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);

    // /drive/folders/<id> or /drive/u/<n>/folders/<id>
    const folderMatch = url.pathname.match(/\/folders\/([a-zA-Z0-9_-]{10,256})/);
    if (folderMatch?.[1]) {
      return folderMatch[1];
    }

    // /file/d/<id>
    const fileMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{10,256})/);
    if (fileMatch?.[1]) {
      return fileMatch[1];
    }

    // ?id=<id>
    const idParam = url.searchParams.get("id");
    if (idParam && FOLDER_ID_REGEX.test(idParam)) {
      return idParam;
    }
  } catch {
    // If not a parseable URL, fallback to regex search in string
    const fallbackMatch = trimmed.match(/([a-zA-Z0-9_-]{15,256})/);
    if (fallbackMatch?.[1]) {
      return fallbackMatch[1];
    }
  }

  return null;
}
