import "server-only";

import JSZip from "jszip";
import { PDFParse } from "pdf-parse";
import { imageSize } from "image-size";

import { getDriveClient } from "@/lib/drive.client";

import type { DriveFileRaw, EnrichedFileMetadata, RichMetadata } from "./file.types";

const PDF_MIME = "application/pdf";
const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

async function downloadDriveFileBuffer(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();
  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
      supportsAllDrives: true,
    },
    {
      responseType: "arraybuffer",
    },
  );

  const payload = response.data;

  if (payload instanceof ArrayBuffer) {
    return Buffer.from(payload);
  }

  if (Buffer.isBuffer(payload)) {
    return payload;
  }

  if (typeof payload === "string") {
    return Buffer.from(payload);
  }

  throw new Error("Failed to download file content");
}

async function extractPdfMetadata(buffer: Buffer): Promise<RichMetadata> {
  const parser = new PDFParse({ data: buffer });
  let pageCount = 0;
  try {
    const info = await parser.getInfo();
    pageCount = info.total;
  } finally {
    await parser.destroy();
  }

  if (!isPositiveInteger(pageCount)) {
    throw new Error("Invalid PDF metadata");
  }

  return {
    type: "pdf",
    pageCount,
  };
}

async function extractPptMetadata(buffer: Buffer): Promise<RichMetadata> {
  const zip = await JSZip.loadAsync(buffer);
  const slideCount = Object.keys(zip.files).filter((filePath) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(filePath),
  ).length;

  if (!isPositiveInteger(slideCount)) {
    throw new Error("Invalid PPT metadata");
  }

  return {
    type: "ppt",
    slideCount,
  };
}

function extractImageMetadata(buffer: Buffer): RichMetadata {
  const dimensions = imageSize(buffer);

  if (!isPositiveInteger(dimensions.width) || !isPositiveInteger(dimensions.height)) {
    throw new Error("Invalid image metadata");
  }

  return {
    type: "image",
    width: dimensions.width,
    height: dimensions.height,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function getFileExtension(name: string): string | null {
  const trimmed = name.trim();
  const dotIndex = trimmed.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === trimmed.length - 1) {
    return null;
  }

  return trimmed.slice(dotIndex + 1).toLowerCase();
}

export async function enrichMetadata(
  fileId: string,
  raw: DriveFileRaw,
): Promise<EnrichedFileMetadata> {
  const extension = getFileExtension(raw.name);
  const metadata: EnrichedFileMetadata = {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    extension,
    size: raw.size,
    sizeFormatted: formatBytes(raw.size),
    modifiedTime: raw.modifiedTime,
    enriched: { type: "other" },
  };

  const mime = raw.mimeType.toLowerCase();

  if (mime !== PDF_MIME && mime !== PPTX_MIME && !mime.startsWith("image/")) {
    return metadata;
  }

  const buffer = await downloadDriveFileBuffer(fileId);

  if (mime === PDF_MIME) {
    metadata.enriched = await extractPdfMetadata(buffer);
    return metadata;
  }

  if (mime === PPTX_MIME) {
    metadata.enriched = await extractPptMetadata(buffer);
    return metadata;
  }

  metadata.enriched = extractImageMetadata(buffer);
  return metadata;
}
