import type { RxJsonSchema } from "rxdb";
import type { DriveFileDocType } from "../types";

export const driveFileSchema: RxJsonSchema<DriveFileDocType> = {
  version: 1,
  primaryKey: "id", // `${sourceId}:${driveFileId}`
  type: "object",
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      maxLength: 512,
    },
    sourceId: {
      type: "string",
      maxLength: 256,
    },
    driveFileId: {
      type: "string",
      maxLength: 256,
    },
    parentFolderId: {
      type: "string",
      maxLength: 256,
    },
    workspaceId: {
      type: "string",
      maxLength: 64,
    },
    localFolderId: {
      type: "string",
      maxLength: 64,
    },
    name: {
      type: "string",
    },
    mimeType: {
      type: "string",
    },
    size: {
      type: ["number", "null"],
    },
    modifiedTime: {
      type: ["string", "null"],
    },
    webViewUrl: {
      type: ["string", "null"],
    },
    path: {
      type: "string",
    },
    remoteStatus: {
      type: "string",
      enum: ["available", "deleted", "unavailable"],
      maxLength: 32,
    },
    contentStatus: {
      type: "string",
      enum: ["not-downloaded", "downloading", "downloaded", "indexed", "error"],
      maxLength: 32,
    },
    errorMessage: {
      type: ["string", "null"],
    },
    indexedAt: {
      type: ["number", "null"],
    },
    downloadedAt: {
      type: ["number", "null"],
    },
    lastOpenedAt: {
      type: "number",
      minimum: 0,
      maximum: 10000000000000,
      multipleOf: 1,
    },
    createdAt: {
      type: "number",
      minimum: 0,
      maximum: 10000000000000,
      multipleOf: 1,
    },
    updatedAt: {
      type: "number",
      minimum: 0,
      maximum: 10000000000000,
      multipleOf: 1,
    },
  },
  required: [
    "id",
    "sourceId",
    "driveFileId",
    "parentFolderId",
    "name",
    "mimeType",
    "path",
    "remoteStatus",
    "contentStatus",
    "lastOpenedAt",
    "createdAt",
    "updatedAt",
  ],
  indexes: [
    "sourceId",
    "driveFileId",
    "remoteStatus",
    "updatedAt",
    "lastOpenedAt",
  ],
};

export const driveFileMigrationStrategies = {
  1: (oldDoc: Record<string, any>): Record<string, any> => {
    return {
      ...oldDoc,
      workspaceId: oldDoc.workspaceId || "",
      localFolderId: oldDoc.localFolderId || "",
      lastOpenedAt: typeof oldDoc.lastOpenedAt === "number" ? oldDoc.lastOpenedAt : 0,
    };
  },
};
