import JSZip from "jszip";

function truncateText(value: string): string {
  if (value.length <= 800) {
    return value;
  }

  return value.slice(0, 800);
}

/**
 * Regex matching standard PPTX slide paths (e.g. `ppt/slides/slide1.xml`).
 * Used for dynamic discovery instead of hardcoded slide indices.
 */
const SLIDE_PATH_REGEX = /^ppt\/slides\/slide\d+\.xml$/;

export async function extractPptxText(arrayBuffer: ArrayBuffer): Promise<string | null> {
  try {
    // Guard: DOMParser is not available in all worker contexts (Safari < 15).
    if (typeof DOMParser === "undefined") {
      return null;
    }

    let zip: JSZip | null = await JSZip.loadAsync(arrayBuffer);
    const parser = new DOMParser();
    const collected: string[] = [];

    // Dynamically discover slide paths rather than hardcoding slide1–3.
    // Some PPTX files use zero-indexed or non-standard naming.
    const slidePaths = Object.keys(zip.files)
      .filter((path) => SLIDE_PATH_REGEX.test(path))
      .sort()
      .slice(0, 3);

    for (const slidePath of slidePaths) {
      const slideFile = zip.file(slidePath);
      if (!slideFile) {
        continue;
      }

      const slideXml = await slideFile.async("string");
      const doc = parser.parseFromString(slideXml, "application/xml");
      const textNodes = doc.querySelectorAll("a\\:t");

      for (const node of Array.from(textNodes)) {
        const value = (node.textContent ?? "").trim();
        if (value.length > 0) {
          collected.push(value);
        }
      }
    }

    // Release the unzipped archive to free memory before the next file.
    zip = null;

    const normalized = collected.join(" ").replace(/\s+/g, " ").trim();
    if (normalized.length === 0) {
      return null;
    }

    return truncateText(normalized);
  } catch {
    return null;
  }
}
