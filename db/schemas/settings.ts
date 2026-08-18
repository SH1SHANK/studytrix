import type { RxJsonSchema } from "rxdb";
import type { SettingsDocType } from "../types";

export const settingsSchema: RxJsonSchema<SettingsDocType> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
      maxLength: 128,
    },
    value: {},
    updatedAt: {
      type: "number",
      minimum: 0,
      maximum: 10000000000000,
      multipleOf: 1,
    },
  },
  required: ["id", "updatedAt"],
  indexes: ["updatedAt"],
};
