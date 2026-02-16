export type DriveFileRaw = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string | null;
};

export type EnrichedFileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  extension: string | null;
  size: number;
  sizeFormatted: string;
  modifiedTime: string | null;
  enriched?: RichMetadata;
};

export type RichMetadata =
  | { type: "pdf"; pageCount: number }
  | { type: "ppt"; slideCount: number }
  | { type: "image"; width: number; height: number }
  | { type: "other" };
