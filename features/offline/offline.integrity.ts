import { deleteFile, deleteSearchIndex, getFile } from "./offline.db";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateChecksum(blob: Blob): Promise<string> {
  if (!globalThis.crypto || typeof globalThis.crypto.subtle === "undefined") {
    throw new Error("Web Crypto API is unavailable");
  }

  const arrayBuffer = await blob.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", arrayBuffer);
  return bytesToHex(new Uint8Array(digest));
}

export async function verifyIntegrity(
  fileId: string,
  remoteModifiedTime: string | null,
): Promise<boolean> {
  const cached = await getFile(fileId);

  if (!cached) {
    return false;
  }

  if (cached.modifiedTime !== remoteModifiedTime) {
    await deleteFile(fileId);
    await deleteSearchIndex(fileId);
    return false;
  }

  if (cached.checksum) {
    const computed = await generateChecksum(cached.blob);
    if (computed !== cached.checksum) {
      await deleteFile(fileId);
      await deleteSearchIndex(fileId);
      return false;
    }
  }

  return true;
}
