import type { RxJsonSchema } from "rxdb";
import type { TagAssignmentDocType } from "../types";

export const tagAssignmentSchema: RxJsonSchema<TagAssignmentDocType> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      maxLength: 384, // `${entityId}:${tagId}`
    },
    entityId: {
      type: "string",
      maxLength: 256,
    },
    entityType: {
      type: "string",
      enum: ["file", "folder"],
    },
    tagId: {
      type: "string",
      maxLength: 128,
    },
    starred: {
      type: "boolean",
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
  required: ["id", "entityId", "entityType", "tagId", "starred", "createdAt", "updatedAt"],
  indexes: ["entityId", "tagId", "updatedAt"],
};
