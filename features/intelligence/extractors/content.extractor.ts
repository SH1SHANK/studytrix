/**
 * Full-content extraction service for the "Copy Contents" file action.
 *
 * Unlike the indexing-oriented extractors that cap output at 800 chars / 3 pages,
 * this module extracts the **entire** text content from a file and returns it
 * alongside a confidence indicator so the UI can show user-friendly messages.
 */

import Tesseract from "tesseract.js";
import mammoth from "mammoth";

import { loadPdfDocument } from "./pdf.runtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FullExtractionResult {
  text: string;
  /** 0 – 100; only meaningful for OCR-based extraction. `100` for native text. */
  confidence: number;
  /** `true` when the result was obtained via OCR. */
  isOcrResult: boolean;
}

// ---------------------------------------------------------------------------
// Text cleaning helpers
// ---------------------------------------------------------------------------

const CONTROL_CHAR_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

function cleanExtractedText(raw: string): string {
  return raw
    .replace(CONTROL_CHAR_RE, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Collapse runs of 3+ newlines → 2
    .replace(/\n{3,}/g, "\n\n")
    // Collapse horizontal whitespace runs
    .replace(/[^\S\n]+/g, " ")
    // Trim each line
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// MIME type support check
// ---------------------------------------------------------------------------

const EXTRACTABLE_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isExtractableMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) {
    return false;
  }

  return EXTRACTABLE_MIME_TYPES.has(mimeType.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// Full PDF extraction (all pages)
// ---------------------------------------------------------------------------

async function extractFullPdfText(arrayBuffer: ArrayBuffer): Promise<FullExtractionResult | null> {
  const pdf = await loadPdfDocument(arrayBuffer);
  const numPages = Math.max(0, Number(pdf.numPages) || 0);
  const collected: string[] = [];

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    for (const item of textContent.items as Array<{ str?: string }>) {
      const token = typeof item?.str === "string" ? item.str.trim() : "";
      if (token.length > 0) {
        collected.push(token);
      }
    }

    page.cleanup?.();
  }

  await pdf.destroy?.();

  const joined = collected.join(" ").trim();

  // If very little text was found, this is likely an image-based (scanned) PDF.
  if (joined.length < 50) {
    return null; // signal caller to try OCR
  }

  return {
    text: cleanExtractedText(joined),
    confidence: 100,
    isOcrResult: false,
  };
}

// ---------------------------------------------------------------------------
// Full OCR extraction (images + scanned PDFs — all pages)
// ---------------------------------------------------------------------------

async function ocrImageBlob(blob: Blob): Promise<{ text: string; confidence: number } | null> {
  let worker: Tesseract.Worker | null = null;

  try {
    worker = await Tesseract.createWorker("eng");
    const result = await worker.recognize(blob as never);

    const text = (result.data.text ?? "").trim();
    const confidence = Number(result.data.confidence ?? 0);

    if (!text) {
      return null;
    }

    return { text, confidence };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore
      }
    }
  }
}

async function ocrScannedPdf(arrayBuffer: ArrayBuffer): Promise<{ text: string; confidence: number } | null> {
  if (typeof OffscreenCanvas === "undefined") {
    return null;
  }

  const pdf = await loadPdfDocument(arrayBuffer);
  const numPages = Math.max(0, Number(pdf.numPages) || 0);
  const allText: string[] = [];
  let totalConfidence = 0;
  let pagesOcrd = 0;

  let worker: Tesseract.Worker | null = null;

  try {
    worker = await Tesseract.createWorker("eng");

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const width = Math.max(1, Math.ceil(viewport.width));
      const height = Math.max(1, Math.ceil(viewport.height));

      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) {
        page.cleanup?.();
        continue;
      }

      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;

      const imageData = context.getImageData(0, 0, width, height);
      const result = await worker.recognize(imageData as never);
      const pageText = (result.data.text ?? "").trim();
      const pageConfidence = Number(result.data.confidence ?? 0);

      if (pageText) {
        allText.push(pageText);
        totalConfidence += pageConfidence;
        pagesOcrd += 1;
      }

      page.cleanup?.();
    }
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore
      }
    }
    await pdf.destroy?.();
  }

  if (allText.length === 0) {
    return null;
  }

  return {
    text: allText.join("\n\n"),
    confidence: pagesOcrd > 0 ? Math.round(totalConfidence / pagesOcrd) : 0,
  };
}

// ---------------------------------------------------------------------------
// Full DOCX extraction
// ---------------------------------------------------------------------------

async function extractFullDocxText(arrayBuffer: ArrayBuffer): Promise<FullExtractionResult | null> {
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = (result?.value ?? "").trim();

  if (!text) {
    return null;
  }

  return {
    text: cleanExtractedText(text),
    confidence: 100,
    isOcrResult: false,
  };
}

// ---------------------------------------------------------------------------
// Full PPTX extraction (dynamic slide discovery)
// ---------------------------------------------------------------------------

async function extractFullPptxText(arrayBuffer: ArrayBuffer): Promise<FullExtractionResult | null> {
  // Dynamic import to avoid pulling JSZip into the main bundle path
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((left, right) => {
      const leftNum = Number(left.match(/slide(\d+)/)?.[1] ?? 0);
      const rightNum = Number(right.match(/slide(\d+)/)?.[1] ?? 0);
      return leftNum - rightNum;
    });

  const collected: string[] = [];

  for (const slidePath of slideFiles) {
    const xml = await zip.file(slidePath)?.async("text");
    if (!xml) {
      continue;
    }

    // Extract text between <a:t> tags
    const textMatches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) ?? [];
    for (const match of textMatches) {
      const content = match.replace(/<[^>]+>/g, "").trim();
      if (content) {
        collected.push(content);
      }
    }
  }

  if (collected.length === 0) {
    return null;
  }

  return {
    text: cleanExtractedText(collected.join(" ")),
    confidence: 100,
    isOcrResult: false,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Extracts the full text content of a file document. Returns cleaned text
 * with a confidence score. For OCR results, confidence < 100.
 *
 * @param entityId - The file entity ID (used to fetch via /api/file/{id}/stream)
 * @param mimeType - The MIME type of the file
 */
export async function extractFullFileContent(
  entityId: string,
  mimeType: string,
): Promise<FullExtractionResult> {
  const normalizedMime = mimeType.trim().toLowerCase();

  // Fetch the file
  const response = await fetch(`/api/file/${encodeURIComponent(entityId)}/stream`);
  if (!response.ok) {
    throw new Error("Could not download the file for extraction.");
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error("File appears to be empty.");
  }

  // PDF — try native text first, fall back to OCR for scanned docs
  if (normalizedMime === "application/pdf") {
    const nativeResult = await extractFullPdfText(arrayBuffer);
    if (nativeResult) {
      return nativeResult;
    }

    // Scanned PDF — OCR all pages
    const ocrResult = await ocrScannedPdf(arrayBuffer);
    if (ocrResult) {
      return {
        text: cleanExtractedText(ocrResult.text),
        confidence: ocrResult.confidence,
        isOcrResult: true,
      };
    }

    throw new Error("Could not extract any text from this PDF. It may contain only graphics.");
  }

  // DOCX
  if (normalizedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await extractFullDocxText(arrayBuffer);
    if (result) {
      return result;
    }

    throw new Error("Could not extract text from this document.");
  }

  // PPTX
  if (normalizedMime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    const result = await extractFullPptxText(arrayBuffer);
    if (result) {
      return result;
    }

    throw new Error("Could not extract text from this presentation.");
  }

  // Images — OCR
  if (normalizedMime.startsWith("image/")) {
    const blob = new Blob([arrayBuffer], { type: normalizedMime });
    const ocrResult = await ocrImageBlob(blob);
    if (ocrResult) {
      return {
        text: cleanExtractedText(ocrResult.text),
        confidence: ocrResult.confidence,
        isOcrResult: true,
      };
    }

    throw new Error("Could not read any text from this image.");
  }

  throw new Error("This file type is not supported for content extraction.");
}
