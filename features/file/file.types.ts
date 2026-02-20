export type DriveFileRaw = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string | null;
  resolvedFileId?: string;
};

export type FileMetadata = DriveFileRaw;
