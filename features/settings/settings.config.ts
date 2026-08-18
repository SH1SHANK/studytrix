import { createSettingsSchema } from "./settings.schema";
import type { SettingsSchema } from "./settings.types";

const rawSettingsSchema: SettingsSchema = {
  categories: [
    "General",
    "Library",
    "Storage",
    "Drive Sources",
    "Keyboard",
    "About",
  ],
  items: [
    // 1. General Settings
    {
      id: "theme",
      label: "Visual Theme",
      description: "Choose your preferred visual theme for reading and organizing.",
      type: "theme",
      category: "General",
      defaultValue: "classic",
      options: [
        { label: "Classic", value: "classic" },
        { label: "Midnight", value: "midnight" },
        { label: "Forest", value: "forest" },
        { label: "Sunset", value: "sunset" },
        { label: "Minimal", value: "minimal" },
        { label: "Eclipse", value: "eclipse" },
        { label: "Graphite", value: "graphite" },
        { label: "Aurora (OLED)", value: "aurora" },
      ],
    },
    {
      id: "compact_mode",
      label: "Compact Layout",
      description: "Reduce spacing density across file rows and workspace views.",
      type: "toggle",
      category: "General",
      defaultValue: false,
    },

    // 2. Library Settings
    {
      id: "default_sort_order",
      label: "Default File Sorting",
      description: "Choose how files and study documents are ordered by default.",
      type: "select",
      category: "Library",
      defaultValue: "recent",
      options: [
        { label: "Recently Opened", value: "recent" },
        { label: "Alphabetical (A-Z)", value: "name" },
        { label: "File Size", value: "size" },
      ],
    },
    {
      id: "default_view_mode",
      label: "Default Folder View",
      description: "Choose between grid cards or dense list rows for folders.",
      type: "select",
      category: "Library",
      defaultValue: "grid",
      options: [
        { label: "Grid", value: "grid" },
        { label: "List", value: "list" },
      ],
    },
    {
      id: "show_file_metadata",
      label: "Show File Details",
      description: "Display file sizes, MIME labels, and folder paths under file titles.",
      type: "toggle",
      category: "Library",
      defaultValue: true,
    },
    {
      id: "recent_history_limit",
      label: "Recent Files Limit",
      description: "Maximum number of recent files displayed on Home and Recent views.",
      type: "select",
      category: "Library",
      defaultValue: "24",
      options: [
        { label: "12 files", value: "12" },
        { label: "24 files", value: "24" },
        { label: "48 files", value: "48" },
      ],
    },

    // 3. Storage Settings
    {
      id: "storage_location",
      label: "Local Offline Storage",
      description: "Allocated local storage for offline study files and metadata.",
      type: "info",
      category: "Storage",
    },
    {
      id: "clear_offline_storage",
      label: "Clear Cached Downloads",
      description: "Remove downloaded file copies from this device. Workspace structures and Drive links remain intact.",
      type: "danger",
      category: "Storage",
    },

    // 4. Drive Sources Settings
    {
      id: "drive_sources_info",
      label: "Connected Drive Sources",
      description: "Public Google Drive folders indexed into your local library.",
      type: "info",
      category: "Drive Sources",
    },

    // 5. Keyboard Settings
    {
      id: "keyboard_shortcuts_info",
      label: "Keyboard Shortcuts",
      description: "Quick reference for keyboard navigation and command palette.",
      type: "info",
      category: "Keyboard",
    },

    // 6. About Settings
    {
      id: "about_studytrix",
      label: "About Studytrix",
      description: "Version 0.9.4 · Local-First, Offline Study Organizer.",
      type: "info",
      category: "About",
    },
  ],
};

export const SETTINGS_SCHEMA = createSettingsSchema(rawSettingsSchema);
