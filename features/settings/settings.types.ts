export type SettingType =
  | "toggle"
  | "select"
  | "slider"
  | "theme"
  | "action"
  | "danger"
  | "info";

export interface SettingOption {
  label: string;
  value: string;
}

export interface SettingItem {
  id: string;
  label: string;
  description?: string;
  buttonLabel?: string;
  type: SettingType;
  defaultValue?: unknown;
  options?: SettingOption[];
  min?: number;
  max?: number;
  step?: number;
  category: string;
  advanced?: boolean;
  requiresRestart?: boolean;
}

export interface SettingsSchema {
  categories: string[];
  items: SettingItem[];
}
