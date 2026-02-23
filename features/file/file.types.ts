export type DriveFileRaw = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string | null;
  resolvedFileId?: string;
  sourceMimeType?: string;
};

export type FileMetadata = DriveFileRaw;
