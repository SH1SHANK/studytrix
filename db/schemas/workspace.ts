import type { RxJsonSchema } from "rxdb";
import type { WorkspaceDocType } from "../types";

export const workspaceSchema: RxJsonSchema<WorkspaceDocType> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      maxLength: 64,
    },
    driveFolderId: {
      type: "string",
      maxLength: 256,
    },
    name: {
      type: "string",
    },
    description: {
      type: ["string", "null"],
    },
    category: {
      type: ["string", "null"],
      maxLength: 128,
    },
    color: {
      type: ["string", "null"],
    },
    pinned: {
      type: "boolean",
    },
    itemCount: {
      type: ["number", "null"],
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
  required: ["id", "driveFolderId", "name", "pinned", "createdAt", "updatedAt"],
  indexes: ["updatedAt", ["pinned", "updatedAt"]],
};
