import type { RxJsonSchema } from "rxdb";
import type { DriveSourceDocType } from "../types";

export const driveSourceSchema: RxJsonSchema<DriveSourceDocType> = {
  version: 0,
  primaryKey: "id", // Google Drive folder ID
  type: "object",
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      maxLength: 256,
    },
    url: {
      type: "string",
    },
    name: {
      type: "string",
    },
    addedAt: {
      type: "number",
      minimum: 0,
      maximum: 10000000000000,
      multipleOf: 1,
    },
    lastScannedAt: {
      type: ["number", "null"],
      minimum: 0,
      maximum: 10000000000000,
      multipleOf: 1,
    },
    fileCount: {
      type: "number",
      minimum: 0,
      maximum: 1000000000,
      multipleOf: 1,
    },
    status: {
      type: "string",
      enum: ["ready", "scanning", "error", "unavailable"],
      maxLength: 32,
    },
    errorMessage: {
      type: ["string", "null"],
    },
  },
  required: ["id", "url", "name", "addedAt", "fileCount", "status"],
  indexes: ["status", "addedAt"],
};
