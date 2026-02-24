import { loadPdfDocument } from "./pdf.runtime";

export type PDFTextExtractionOptions = {
  maxPages?: number;
  minChars?: number;
  maxChars?: number;
};

export type PDFTextExtractionResult = {
  text: string;
  pagesRead: number;
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function extractPDFText(
  arrayBuffer: ArrayBuffer,
  options: PDFTextExtractionOptions = {},
): Promise<PDFTextExtractionResult> {
  const {
    maxPages = 3,
    minChars = 50,
    maxChars = 8000,
  } = options;

  try {
    const pdf = await loadPdfDocument(arrayBuffer);

    try {
      const pagesToRead = Math.max(0, Math.min(maxPages, Number(pdf.numPages) || 0));
      const collected: string[] = [];

      for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
        let page;
        try {
          page = await pdf.getPage(pageNumber);
          const textContent = await page.getTextContent();

          for (const item of textContent.items as Array<{ str?: string }>) {
            const token = typeof item?.str === "string" ? item.str.trim() : "";
            if (token.length > 0) {
              collected.push(token);
            }
          }
        } finally {
          page?.cleanup?.();
        }
      }

      const normalized = normalizeText(collected.join(" "));
      if (normalized.length < minChars) {
        return {
          text: "",
          pagesRead: pagesToRead,
        };
      }

      return {
        text: normalized.slice(0, maxChars),
        pagesRead: pagesToRead,
      };
    } finally {
      await pdf.destroy?.();
    }
  } catch {
    return {
      text: "",
      pagesRead: 0,
    };
  }
}
