import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function loadPdfDocument(arrayBuffer: ArrayBuffer) {
  const loadingTask = getDocument({
    data: new Uint8Array(arrayBuffer),
    disableWorker: true,
  } as unknown as Parameters<typeof getDocument>[0]);

  return loadingTask.promise;
}
