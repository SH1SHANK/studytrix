import mammoth from "mammoth";

function truncateText(value: string): string {
  if (value.length <= 800) {
    return value;
  }

  return value.slice(0, 800);
}

export async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string | null> {
  try {
    let result: { value: string } | null = await mammoth.extractRawText({ arrayBuffer });
    const normalized = (result?.value ?? "").replace(/\s+/g, " ").trim();

    // Release the mammoth result object to hint GC before the next file.
    result = null;

    if (normalized.length === 0) {
      return null;
    }

    return truncateText(normalized);
  } catch {
    return null;
  }
}
