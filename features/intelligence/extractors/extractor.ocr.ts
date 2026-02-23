import Tesseract from "tesseract.js";

import { loadPdfDocument } from "./pdf.runtime";

const MAX_FILES_PER_BATCH = 5;
const MIN_CONFIDENCE_THRESHOLD = 50;
const MAX_PAGES_TO_OCR = 1;

/** If Tesseract worker creation fails (e.g. offline), skip OCR for the rest of the session. */
let ocrDisabledForSession = false;

export function shouldRunOCR(): boolean {
  if (ocrDisabledForSession) {
    return false;
  }

  const runtimeNavigator = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  if (runtimeNavigator.deviceMemory !== undefined && runtimeNavigator.deviceMemory < 2) {
    return false;
  }

  if (runtimeNavigator.connection?.saveData === true) {
    return false;
  }

  const effectiveType = runtimeNavigator.connection?.effectiveType;
  if (effectiveType === "2g" || effectiveType === "slow-2g") {
    return false;
  }

  return true;
}

class OCRBatchManager {
  private worker: Tesseract.Worker | null = null;

  private filesProcessedInCurrentBatch = 0;

  async processImage(imageData: ImageData | Blob): Promise<string | null> {
    if (this.filesProcessedInCurrentBatch >= MAX_FILES_PER_BATCH) {
      await this.terminateWorker();
    }

    if (!this.worker) {
      // Wrap Tesseract worker creation in try/catch with a timeout.
      // Tesseract.createWorker('eng') downloads ~4MB language data on first call;
      // if the device is offline, this will fail or hang.
      try {
        const workerPromise = Tesseract.createWorker("eng");
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Tesseract worker creation timeout")), 10_000);
        });

        this.worker = await Promise.race([workerPromise, timeoutPromise]);
        this.filesProcessedInCurrentBatch = 0;
      } catch {
        ocrDisabledForSession = true;
        return null;
      }
    }

    try {
      const result = await this.worker.recognize(imageData as never);
      this.filesProcessedInCurrentBatch += 1;

      const confidence = Number(result.data.confidence ?? 0);
      if (confidence < MIN_CONFIDENCE_THRESHOLD) {
        return null;
      }

      const text = (result.data.text ?? "").trim();
      if (!text) {
        return null;
      }

      return text.slice(0, 800);
    } catch {
      this.filesProcessedInCurrentBatch += 1;
      return null;
    }
  }

  async terminateWorker(): Promise<void> {
    if (!this.worker) {
      return;
    }

    try {
      await this.worker.terminate();
    } catch {
      // Termination can fail if the worker is already dead.
    }

    this.worker = null;
    this.filesProcessedInCurrentBatch = 0;
  }
}

export const ocrManager = new OCRBatchManager();

export async function ocrImagePDF(arrayBuffer: ArrayBuffer): Promise<string | null> {
  try {
    if (typeof OffscreenCanvas === "undefined") {
      return null;
    }

    const pdf = await loadPdfDocument(arrayBuffer);
    const page = await pdf.getPage(Math.min(MAX_PAGES_TO_OCR, 1));
    const viewport = page.getViewport({ scale: 1.5 });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const imageData = context.getImageData(0, 0, width, height);
    const ocrResult = await ocrManager.processImage(imageData);

    // Clean up PDF page proxy and document to release rendering resources.
    page.cleanup?.();
    await pdf.destroy?.();

    return ocrResult;
  } catch {
    return null;
  }
}
