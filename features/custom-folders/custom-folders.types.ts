export type CustomFolder = {
  id: string;
  label: string;
  colour: string;
  pinnedToTop: boolean;
  addedAt: number;
  lastRefreshedAt: number;
  fileCount: number;
  folderCount: number;
  accessVerifiedAt: number;
  sourceKind?: "drive" | "local" | "local-virtual";
  parentFolderId?: string;
  driveFolderId?: string;
  localHandleKey?: string;
  syncStatus?: {
    lastScannedAt: number;
    fileCount: number;
    lastSyncError?: "PERMISSION_LOST" | "SCAN_FAILED" | "QUOTA_EXCEEDED" | null;
  };
};

export type CustomFolderPermissionLevel = "none" | "read" | "write";

export type CustomFolderVerifyErrorCode =
  | "FOLDER_NOT_FOUND"
  | "ACCESS_DENIED"
  | "INVALID_ID"
  | "DRIVE_ERROR";

export type CustomFolderVerifyResponse = {
  accessible: boolean;
  permissionLevel: CustomFolderPermissionLevel;
  name: string;
  fileCount: number;
  folderCount: number;
  ownerDomain: string;
  createdTime: string;
  safetyFlags: string[];
};

export type CustomFolderVerifyErrorResponse = {
  errorCode: CustomFolderVerifyErrorCode;
  message: string;
};
