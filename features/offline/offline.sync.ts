import { deleteFile, deleteSearchIndex, getAllFiles } from "./offline.db";
import { verifyIntegrity } from "./offline.integrity";

export async function syncOfflineFiles(
  fetchMetadata: (fileId: string) => Promise<{ modifiedTime: string | null }>,
): Promise<void> {
  const cachedFiles = await getAllFiles();

  for (const record of cachedFiles) {
    try {
      const remote = await fetchMetadata(record.fileId);
      const stillValid = await verifyIntegrity(record.fileId, remote.modifiedTime);

      if (!stillValid) {
        await deleteFile(record.fileId);
        await deleteSearchIndex(record.fileId);
      }
    } catch {
    }
  }
}

export function registerOfflineSync(
  fetchMetadata: (fileId: string) => Promise<{ modifiedTime: string | null }>,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => {
    void syncOfflineFiles(fetchMetadata);
  };

  window.addEventListener("online", handler);

  return () => {
    window.removeEventListener("online", handler);
  };
}
