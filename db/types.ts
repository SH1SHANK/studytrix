import type { RxCollection, RxDatabase, RxDocument } from "rxdb";

export interface WorkspaceDocType {
  id: string;
  driveFolderId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  color?: string | null;
  pinned: boolean;
  itemCount?: number | null;
  createdAt: number;
  updatedAt: number;
}

export type WorkspaceDocument = RxDocument<WorkspaceDocType>;
export type WorkspaceCollection = RxCollection<WorkspaceDocType>;

export interface FolderDocType {
  id: string;
  workspaceId: string;
  parentFolderId: string; // "" for root-level folders
  name: string;
  color?: string | null;
  createdAt: number;
  updatedAt: number;
}

export type FolderDocument = RxDocument<FolderDocType>;
export type FolderCollection = RxCollection<FolderDocType>;

export interface TagDocType {
  id: string;
  name: string;
  color: string;
  uses: number;
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TagDocument = RxDocument<TagDocType>;
export type TagCollection = RxCollection<TagDocType>;

export interface TagAssignmentDocType {
  id: string; // `${entityId}:${tagId}`
  entityId: string;
  entityType: "file" | "folder";
  tagId: string;
  starred: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TagAssignmentDocument = RxDocument<TagAssignmentDocType>;
export type TagAssignmentCollection = RxCollection<TagAssignmentDocType>;

export interface SettingsDocType {
  id: string;
  value: unknown;
  updatedAt: number;
}

export type SettingsDocument = RxDocument<SettingsDocType>;
export type SettingsCollection = RxCollection<SettingsDocType>;

export type DriveSourceStatus = "ready" | "scanning" | "error" | "unavailable";

export interface DriveSourceDocType {
  id: string; // Google Drive folder ID
  url: string;
  name: string;
  addedAt: number;
  lastScannedAt: number | null;
  fileCount: number;
  status: DriveSourceStatus;
  errorMessage?: string | null;
}

export type DriveSourceDocument = RxDocument<DriveSourceDocType>;
export type DriveSourceCollection = RxCollection<DriveSourceDocType>;

export type DriveFileRemoteStatus = "available" | "deleted" | "unavailable";
export type DriveFileContentStatus = "not-downloaded" | "downloading" | "downloaded" | "indexed" | "error";

export interface DriveFileDocType {
  id: string; // `${sourceId}:${driveFileId}`
  sourceId: string;
  driveFileId: string;
  parentFolderId: string;
  workspaceId?: string; // "" or workspace ID
  localFolderId?: string; // "" or local folder ID
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  webViewUrl: string | null;
  path: string;
  remoteStatus: DriveFileRemoteStatus;
  contentStatus: DriveFileContentStatus;
  errorMessage?: string | null;
  indexedAt: number | null;
  downloadedAt: number | null;
  lastOpenedAt: number; // 0 for never opened
  createdAt: number;
  updatedAt: number;
}

export type DriveFileDocument = RxDocument<DriveFileDocType>;
export type DriveFileCollection = RxCollection<DriveFileDocType>;

export type StudytrixCollections = {
  workspaces: WorkspaceCollection;
  folders: FolderCollection;
  tags: TagCollection;
  tag_assignments: TagAssignmentCollection;
  settings: SettingsCollection;
  drive_sources: DriveSourceCollection;
  drive_files: DriveFileCollection;
};

export type StudytrixDatabase = RxDatabase<StudytrixCollections>;
