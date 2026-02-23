import { loadPdfDocument } from "./pdf.runtime";

export type PdfExtractionResult = {
  text: string | null;
  isImageBased: boolean;
};

function truncateText(value: string): string {
  if (value.length <= 800) {
    return value;
  }

  return value.slice(0, 800);
}

export async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<PdfExtractionResult> {
  try {
    const pdf = await loadPdfDocument(arrayBuffer);
    
    try {
      const pagesToRead = Math.max(0, Math.min(3, Number(pdf.numPages) || 0));
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

      const joined = collected.join(" ").replace(/\s+/g, " ").trim();
      if (joined.length < 50) {
        return {
          text: null,
          isImageBased: true,
        };
      }

      return {
        text: truncateText(joined),
        isImageBased: false,
      };
    } finally {
      await pdf.destroy?.();
    }
  } catch {
    return {
      text: null,
      isImageBased: false,
    };
  }
}
