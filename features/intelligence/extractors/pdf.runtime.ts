import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = "";

export async function loadPdfDocument(arrayBuffer: ArrayBuffer) {
  try {
    const loadingTask = getDocument({
      data: new Uint8Array(arrayBuffer),
      disableWorker: true,
    } as unknown as Parameters<typeof getDocument>[0]);

    return await loadingTask.promise;
  } catch (error) {
    throw new Error(`Failed to load PDF document: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
