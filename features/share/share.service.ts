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
  // Open progress dialog immediately on tap so users get instant feedback.
  store.startShare(fileName, null, {
    unit: "bytes",
    title: "Preparing to Share",
  });

  try {
    const response = await fetch(`/api/file/${encodeURIComponent(fileId)}/stream`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      toast.error("Failed to fetch file from server.");
      store.setError("Failed to fetch file from server.");
      return;
    }

    const contentLength = response.headers.get("Content-Length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : null;
    store.updateProgress(0, totalBytes);

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
      store.setError("File sharing is not supported for this file type or device.");
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
    store.setError("An error occurred while sharing the file.");
    console.error("Share error:", error);
  }
}
