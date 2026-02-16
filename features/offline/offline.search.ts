import JSZip from "jszip";
import { PDFParse } from "pdf-parse";

import { getAllSearchIndex, putSearchIndex } from "./offline.db";

const MAX_RESULTS = 50;
const MAX_INDEXED_TEXT_LENGTH = 200_000;

function normalizeText(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function extractPdfText(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });

  try {
    const result = await parser.getText();
    return typeof result.text === "string" ? result.text : "";
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const candidatePaths = Object.keys(zip.files).filter((path) =>
    path.startsWith("word/") && path.endsWith(".xml"),
  );

  const sections: string[] = [];

  for (const path of candidatePaths) {
    const file = zip.file(path);
    if (!file) {
      continue;
    }

    const xml = await file.async("string");
    sections.push(xml);
  }

  return sections.join(" ");
}

function isDocxMime(mimeType: string): boolean {
  return mimeType.toLowerCase() ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function isPdfMime(mimeType: string): boolean {
  return mimeType.toLowerCase() === "application/pdf";
}

export async function extractTextForSearch(
  blob: Blob,
  mimeType: string,
  fileName?: string,
): Promise<string> {
  const normalizedMime = mimeType.toLowerCase();
  const normalizedName = fileName?.toLowerCase() ?? "";

  try {
    if (isPdfMime(normalizedMime) || normalizedName.endsWith(".pdf")) {
      return normalizeText(await extractPdfText(blob));
    }

    if (isDocxMime(normalizedMime) || normalizedName.endsWith(".docx")) {
      return normalizeText(await extractDocxText(blob));
    }

    if (normalizedMime.startsWith("text/")) {
      return normalizeText(await blob.text());
    }

    return "";
  } catch {
    return "";
  }
}

export async function indexFileText(
  fileId: string,
  extractedText: string,
): Promise<void> {
  const normalized = normalizeText(extractedText).slice(0, MAX_INDEXED_TEXT_LENGTH);

  await putSearchIndex({
    fileId,
    text: normalized,
    updatedAt: Date.now(),
  });
}

export async function searchOffline(query: string): Promise<string[]> {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const indexRows = await getAllSearchIndex();

  const matches: string[] = [];

  for (const row of indexRows) {
    if (!row.text) {
      continue;
    }

    if (row.text.includes(normalizedQuery)) {
      matches.push(row.fileId);
    }

    if (matches.length >= MAX_RESULTS) {
      break;
    }
  }

  return matches;
}
