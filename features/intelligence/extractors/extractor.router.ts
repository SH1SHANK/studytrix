import { extractDocxText } from "./extractor.docx";
import { extractPdfText } from "./extractor.pdf";
import { extractPptxText } from "./extractor.pptx";

export type ExtractionResult = {
  text: string | null;
  isImageBased: boolean;
};

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function extractTextContent(
  arrayBuffer: ArrayBuffer,
  mimeType: string,
): Promise<ExtractionResult> {
  try {
    // Guard against detached ArrayBuffers (byteLength === 0 after transfer).
    if (arrayBuffer.byteLength === 0) {
      return {
        text: null,
        isImageBased: false,
      };
    }

    const normalizedMime = mimeType.trim().toLowerCase();

    if (normalizedMime === "application/pdf") {
      return extractPdfText(arrayBuffer);
    }

    if (normalizedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return {
        text: await extractDocxText(arrayBuffer),
        isImageBased: false,
      };
    }

    if (normalizedMime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      return {
        text: await extractPptxText(arrayBuffer),
        isImageBased: false,
      };
    }

    if (IMAGE_MIME_TYPES.has(normalizedMime)) {
      return {
        text: null,
        isImageBased: true,
      };
    }

    return {
      text: null,
      isImageBased: false,
    };
  } catch {
    return {
      text: null,
      isImageBased: false,
    };
  }
}
