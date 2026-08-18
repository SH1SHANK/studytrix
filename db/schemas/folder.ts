import type { RxJsonSchema } from "rxdb";
import type { FolderDocType } from "../types";

export const folderSchema: RxJsonSchema<FolderDocType> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      maxLength: 64,
    },
    workspaceId: {
      type: "string",
      maxLength: 64,
    },
    parentFolderId: {
      type: "string",
      maxLength: 64,
    },
    name: {
      type: "string",
    },
    color: {
      type: ["string", "null"],
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
  required: ["id", "workspaceId", "parentFolderId", "name", "createdAt", "updatedAt"],
  indexes: [
    "workspaceId",
    "updatedAt",
    ["workspaceId", "parentFolderId"],
    ["workspaceId", "updatedAt"],
  ],
};
