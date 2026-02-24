export type CachedIndexableFileMessage = {
  fileId: string;
  name: string;
  fullPath: string;
  ancestorIds: string[];
  depth: number;
  repoKind: "global" | "personal";
  isFolder: false;
  mimeType?: string;
  size?: number;
  modifiedTime?: string;
  customFolderId?: string;
};

export type FilesCachedMessage = {
  type: "FILES_CACHED";
  files: CachedIndexableFileMessage[];
  emittedAt: number;
};

export type SwFilesCachedMessage = {
  type: "SW_FILES_CACHED";
  files: CachedIndexableFileMessage[];
  emittedAt: number;
};
