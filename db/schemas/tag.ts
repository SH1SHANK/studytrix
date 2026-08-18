import type { RxJsonSchema } from "rxdb";
import type { TagDocType } from "../types";

export const tagSchema: RxJsonSchema<TagDocType> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      maxLength: 128,
    },
    name: {
      type: "string",
    },
    color: {
      type: "string",
    },
    uses: {
      type: "number",
      minimum: 0,
      maximum: 1000000000,
      multipleOf: 1,
    },
    isSystem: {
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
  required: ["id", "name", "color", "uses", "isSystem", "createdAt", "updatedAt"],
  indexes: ["updatedAt"],
};
