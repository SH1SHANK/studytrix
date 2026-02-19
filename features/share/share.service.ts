import { toast } from "sonner";
import { useShareStore } from "@/features/share/share.store";

export async function shareNativeFile(
  fileId: string,
  fileName: string,
  mimeType: string,
): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.share) {
    toast.error("Sharing is not supported on this device/browser.");
    return;
  }

  const store = useShareStore.getState();

  try {
    const response = await fetch(`/api/file/${encodeURIComponent(fileId)}/stream`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      toast.error("Failed to fetch file from server.");
      return;
    }

    const contentLength = response.headers.get("Content-Length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

    // Open the drawer UI
    store.startShare(fileName, totalBytes);

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loadedBytes = 0;

    // Read the stream chunk by chunk
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loadedBytes += value.length;
      store.updateProgress(loadedBytes);
    }

    // Done downloading into memory
    const blob = new Blob(chunks as BlobPart[], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });

    if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
      toast.error("File sharing is not supported for this file type or device.");
      store.setError();
      return;
    }

    // Launch share sheet, then let the store clean itself up
    store.endShare();
    
    await navigator.share({
      title: fileName,
      files: [file],
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // User cancelled the OS share dialog
      return;
    }
    toast.error("An error occurred while sharing the file.");
    store.setError();
    console.error("Share error:", error);
  }
}
