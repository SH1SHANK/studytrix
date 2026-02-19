export type DriveFileRaw = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string | null;
};

export type FileMetadata = DriveFileRaw;
