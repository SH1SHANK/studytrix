import type { ComponentType } from "react";
import {
  IconArrowLeft,
  IconBolt,
  IconCloudOff,
  IconClockHour4,
  IconDatabase,
  IconFile,
  IconFolder,
  IconSettings,
  IconSparkles,
  IconTag,
  IconX,
} from "@tabler/icons-react";

import type { Course } from "@/features/catalog/catalog.types";
import { type EssentialScopeAction } from "@/features/command/command.scope-ui";
import {
  type CommandGroup as EngineCommandGroup,
  type CommandItem as EngineCommandItem,
} from "@/features/command/command.types";
import {
  type NestedCommandFileEntry,
} from "@/features/command/command.localIndex";
import {
  type PrefixMode,
} from "@/features/command/command.prefix";
import {
  type OfflineLibrarySnapshot,
} from "@/features/offline/offline.library";
import type {
  SearchScope as NavigationSearchScope,
} from "@/features/intelligence/intelligence.types";

export const GROUP_ORDER: EngineCommandGroup[] = [
  "navigation",
  "folders",
  "files",
  "actions",
  "system",
];

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export const GROUP_META: Record<
  EngineCommandGroup,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
    tone: string;
    iconTone: string;
  }
> = {
  navigation: {
    label: "Navigation",
    icon: IconArrowLeft,
    tone: "bg-primary/12",
    iconTone: "text-primary",
  },
  folders: {
    label: "Folders",
    icon: IconFolder,
    tone: "bg-accent/25",
    iconTone: "text-foreground",
  },
  files: {
    label: "Files",
    icon: IconFile,
    tone: "bg-secondary/70",
    iconTone: "text-foreground",
  },
  actions: {
    label: "Actions",
    icon: IconBolt,
    tone: "bg-muted",
    iconTone: "text-muted-foreground",
  },
  system: {
    label: "System",
    icon: IconSparkles,
    tone: "bg-primary/18",
    iconTone: "text-primary",
  },
};

export const DEPARTMENT_SEGMENT_PATTERN = /^[A-Z]{2,5}$/;
export const RECENT_QUERY_STORAGE_KEY = "studytrix.command.recentQueries.v2";
export const MAX_RECENT_QUERIES = 6;
export const RECENT_COMMAND_STORAGE_KEY = "studytrix.command.recentCommands.v2";
export const MAX_RECENT_COMMANDS = 24;
export const SCOPE_STATE_STORAGE_KEY = "studytrix.command.scope.v2";
export const SCOPE_HISTORY_STORAGE_KEY = "studytrix.command.scopeHistory.v2";
export const MAX_SCOPE_HISTORY = 20;
export const SCOPE_HINT_USED_KEY = "studytrix.command.scopeHintUsed.v2";
export const SCOPE_SUMMARY_STORAGE_KEY = "studytrix.command.scopeSummary.v2";
export const SCOPE_SUMMARY_EVENT = "studytrix:command-scope-summary";
export const CMD_QUERY_PARAM = "cmd";
export const CMD_SCOPE_PARAM = "scope";
export const CMD_TEXT_PARAM = "q";
export const NESTED_INDEX_TTL_MS = 30 * 60 * 1000;
export const EMPTY_OFFLINE_LIBRARY: OfflineLibrarySnapshot = {
  files: [],
  folders: [],
  totalBytes: 0,
};

export const PLACEHOLDER_CONTROL_RESERVE_PX = 88;
export const PLACEHOLDER_FOLDER_NAME_MAX = 20;

export type SearchScope = {
  mode: "global" | "actions" | "recents";
  folder: { folderId: string; label: string } | null;
  tag: { tagId: string; label: string } | null;
  domain: { departmentId: string; semesterId: string; label: string } | null;
};

export type ScopeSelectorMode = "folders" | "tags" | "domains";

export type ScopeHistoryEntry = {
  query: string;
  scope: SearchScope;
  createdAt: number;
};

export const GLOBAL_SCOPE: SearchScope = {
  mode: "global",
  folder: null,
  tag: null,
  domain: null,
};

export const REPOSITORY_SCOPE_LABEL = {
  global: "Global Repository",
  personal: "Personal Repository",
} as const;

export function resolveScopedPlaceholder(scope: NavigationSearchScope): string {
  switch (scope.kind) {
    case "global-root":
      return "Search folders, files and actions";
    case "personal-root":
      return "Search in Personal Repository";
    case "folder":
      return `Search in ${scope.folderName}`;
    default:
      return "Search folders, files and actions";
  }
}

export function truncateFolderNameForPlaceholder(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= PLACEHOLDER_FOLDER_NAME_MAX) {
    return trimmed;
  }

  return `${trimmed.slice(0, PLACEHOLDER_FOLDER_NAME_MAX - 1)}…`;
}

export function buildBreadcrumbFromTrail(
  folderId: string,
  trailIds: string[],
  trailLabels: string[],
): Array<{ folderId: string; folderName: string }> {
  const length = Math.min(trailIds.length, trailLabels.length);
  if (length === 0) {
    return [];
  }

  const pairs: Array<{ folderId: string; folderName: string }> = [];
  for (let index = 0; index < length; index += 1) {
    const id = trailIds[index]?.trim();
    const name = trailLabels[index]?.trim();
    if (!id || !name) {
      continue;
    }
    if (pairs[pairs.length - 1]?.folderId === id) {
      continue;
    }
    pairs.push({ folderId: id, folderName: name });
  }

  const currentIndex = pairs.findIndex((entry) => entry.folderId === folderId);
  if (currentIndex >= 0) {
    return pairs.slice(0, currentIndex);
  }

  return pairs.filter((entry) => entry.folderId !== folderId);
}

export const ESSENTIAL_SCOPE_ACTIONS: Array<{
  key: EssentialScopeAction;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "folder", label: "Folder", icon: IconFolder },
  { key: "tag", label: "Tag", icon: IconTag },
  { key: "actions", label: "Actions", icon: IconBolt },
  { key: "clear", label: "Clear", icon: IconX },
];

export function resolvePrefixModeDescriptor(mode: PrefixMode | null): {
  label: string;
  prefix: "/" | "#" | ":" | ">" | "@";
  icon: ComponentType<{ className?: string }>;
} | null {
  if (mode === "folders") {
    return {
      label: "Folder Scope",
      prefix: "/",
      icon: IconFolder,
    };
  }

  if (mode === "tags") {
    return {
      label: "Tag Scope",
      prefix: "#",
      icon: IconTag,
    };
  }

  if (mode === "domains") {
    return {
      label: "Domain Scope",
      prefix: ":",
      icon: IconDatabase,
    };
  }

  if (mode === "actions") {
    return {
      label: "Actions",
      prefix: ">",
      icon: IconBolt,
    };
  }

  if (mode === "recents") {
    return {
      label: "Recents",
      prefix: "@",
      icon: IconClockHour4,
    };
  }

  return null;
}

export function toScopeSelectorMode(mode: PrefixMode | null): ScopeSelectorMode | null {
  if (mode === "folders" || mode === "tags" || mode === "domains") {
    return mode;
  }

  return null;
}

export function isScopeEmpty(scope: SearchScope): boolean {
  return (
    scope.mode === "global"
    && scope.folder === null
    && scope.tag === null
    && scope.domain === null
  );
}

export function cloneScope(scope: SearchScope): SearchScope {
  return {
    mode: scope.mode,
    folder: scope.folder ? { ...scope.folder } : null,
    tag: scope.tag ? { ...scope.tag } : null,
    domain: scope.domain ? { ...scope.domain } : null,
  };
}

export type NestedRootPayload = {
  folderId: string;
  courseCode: string;
  courseName: string;
};

export function titleCaseSegment(value: string): string {
  return decodeURIComponent(value)
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function parseSemesterId(value: string): number | null {
  const parsed = Number.parseInt(value.match(/\d+/)?.[0] ?? value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    return null;
  }
  return parsed;
}

export function getCourseSubtitle(course: Course): string {
  const parts: string[] = [];

  parts.push(`${course.credits} credits`);

  if (course.courseType === "lab") {
    parts.push("Lab");
  }
  if (course.courseType === "elective") {
    parts.push("Elective");
  }

  return parts.slice(0, 2).join(" · ") || "Course folder";
}

export function parseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

export function parseNestedFileEntries(payload: unknown): NestedCommandFileEntry[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("files" in payload) ||
    !Array.isArray((payload as { files?: unknown[] }).files)
  ) {
    return [];
  }

  const entries: NestedCommandFileEntry[] = [];

  for (const entry of (payload as { files: unknown[] }).files) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const id = parseString(record.id);
    const name = parseString(record.name);
    const courseCode = parseString(record.courseCode);
    const courseName = parseString(record.courseName);
    const rootFolderId = parseString(record.rootFolderId);
    const parentFolderId = parseString(record.parentFolderId);
    const parentFolderName = parseString(record.parentFolderName);
    const ancestorFolderIds = Array.isArray(record.ancestorFolderIds)
      ? record.ancestorFolderIds
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
      : [];
    const ancestorFolderNames = Array.isArray(record.ancestorFolderNames)
      ? record.ancestorFolderNames
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
      : [];

    if (!id || !name || !courseCode || !parentFolderId) {
      continue;
    }

    entries.push({
      id,
      name,
      mimeType: parseString(record.mimeType) ?? "application/octet-stream",
      size: parseNumber(record.size),
      modifiedTime: parseString(record.modifiedTime),
      webViewLink: parseString(record.webViewLink),
      courseCode,
      courseName: courseName ?? courseCode,
      rootFolderId: rootFolderId ?? ancestorFolderIds[0] ?? parentFolderId,
      parentFolderId,
      parentFolderName: parentFolderName ?? courseName ?? courseCode,
      ancestorFolderIds:
        ancestorFolderIds.length > 0
          ? ancestorFolderIds
          : [rootFolderId ?? parentFolderId, parentFolderId].filter(Boolean),
      ancestorFolderNames:
        ancestorFolderNames.length > 0
          ? ancestorFolderNames
          : [courseName ?? courseCode, parentFolderName ?? courseName ?? courseCode],
      path: parseString(record.path) ?? (courseName ?? courseCode),
    });
  }

  return entries;
}

export function getCommandIcon(item: EngineCommandItem): ComponentType<{ className?: string }> {
  if (item.id.startsWith("scope-folder-")) {
    return IconFolder;
  }

  if (item.id.startsWith("scope-tag-")) {
    return IconTag;
  }

  if (item.id.startsWith("scope-domain-")) {
    return IconDatabase;
  }

  if (item.group === "folders") {
    return IconFolder;
  }

  if (item.group === "files") {
    return IconFile;
  }

  if (item.id === "open-settings") {
    return IconSettings;
  }

  if (item.id === "open-storage") {
    return IconDatabase;
  }

  if (item.id === "open-offline-library") {
    return IconCloudOff;
  }

  if (item.id.startsWith("tag:")) {
    return IconTag;
  }

  if (item.group === "navigation") {
    return IconArrowLeft;
  }

  if (item.group === "actions") {
    return IconBolt;
  }

  return IconSparkles;
}

export function getCommandIconTone(item: EngineCommandItem): string {
  if (
    item.id.startsWith("scope-folder-")
    || item.id.startsWith("scope-tag-")
    || item.id.startsWith("scope-domain-")
  ) {
    return "text-primary";
  }

  if (item.group === "folders") {
    return "text-primary";
  }

  if (item.group === "files") {
    return "text-foreground";
  }

  if (item.id === "open-settings") {
    return "text-primary";
  }

  if (item.id === "open-storage") {
    return "text-primary";
  }

  if (item.id === "open-offline-library") {
    return "text-primary";
  }

  if (item.id.startsWith("tag:")) {
    return "text-primary";
  }

  if (item.group === "navigation") {
    return "text-primary";
  }

  if (item.group === "actions") {
    return "text-muted-foreground";
  }

  return "text-primary";
}

export function vibrate(duration = 8): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

export function getContentBadge(item: EngineCommandItem): string | null {
  if (item.group === "folders") {
    return "Folder";
  }

  if (item.group === "actions" || item.group === "system" || item.group === "navigation") {
    return null;
  }

  const subtitle = (item.subtitle ?? "").toLowerCase();
  const title = (item.title ?? "").toLowerCase();

  if (subtitle.includes("pdf") || title.endsWith(".pdf")) {
    return "PDF";
  }

  if (subtitle.includes("slides") || subtitle.includes("pptx") || subtitle.includes("presentation")) {
    return "Slides";
  }

  if (subtitle.includes("doc") || subtitle.includes("docx") || subtitle.includes("google doc")) {
    return "Notes";
  }

  if (subtitle.includes("sheet") || subtitle.includes("xlsx")) {
    return "Sheet";
  }

  if (subtitle.includes("image") || subtitle.includes("png") || subtitle.includes("jpeg") || subtitle.includes("webp")) {
    return "Image";
  }

  if (subtitle.includes("video") || subtitle.includes("mp4")) {
    return "Video";
  }

  if (subtitle.includes("zip") || subtitle.includes("rar")) {
    return "Archive";
  }

  return "File";
}

export function loadRecentQueries(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(RECENT_QUERY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, MAX_RECENT_QUERIES);
  } catch {
    return [];
  }
}

export function persistRecentQueries(queries: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      RECENT_QUERY_STORAGE_KEY,
      JSON.stringify(queries.slice(0, MAX_RECENT_QUERIES)),
    );
  } catch {
    // ignore storage failures in private mode
  }
}

export function loadRecentCommandIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(RECENT_COMMAND_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, MAX_RECENT_COMMANDS);
  } catch {
    return [];
  }
}

export function persistRecentCommandIds(commandIds: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      RECENT_COMMAND_STORAGE_KEY,
      JSON.stringify(commandIds.slice(0, MAX_RECENT_COMMANDS)),
    );
  } catch {
    // ignore storage failures in private mode
  }
}

export function isSearchScope(value: unknown): value is SearchScope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const mode = typeof record.mode === "string" ? record.mode : "";
  const isValidMode = mode === "global" || mode === "actions" || mode === "recents";
  if (!isValidMode) {
    return false;
  }

  const folder = record.folder;
  const folderValid =
    folder === null
    || (
      typeof folder === "object"
      && folder !== null
      && typeof (folder as { folderId?: unknown }).folderId === "string"
      && (folder as { folderId: string }).folderId.trim().length > 0
      && typeof (folder as { label?: unknown }).label === "string"
      && (folder as { label: string }).label.trim().length > 0
    );
  if (!folderValid) {
    return false;
  }

  const tag = record.tag;
  const tagValid =
    tag === null
    || (
      typeof tag === "object"
      && tag !== null
      && typeof (tag as { tagId?: unknown }).tagId === "string"
      && (tag as { tagId: string }).tagId.trim().length > 0
      && typeof (tag as { label?: unknown }).label === "string"
      && (tag as { label: string }).label.trim().length > 0
    );
  if (!tagValid) {
    return false;
  }

  const domain = record.domain;
  const domainValid =
    domain === null
    || (
      typeof domain === "object"
      && domain !== null
      && typeof (domain as { departmentId?: unknown }).departmentId === "string"
      && (domain as { departmentId: string }).departmentId.trim().length > 0
      && typeof (domain as { semesterId?: unknown }).semesterId === "string"
      && (domain as { semesterId: string }).semesterId.trim().length > 0
      && typeof (domain as { label?: unknown }).label === "string"
      && (domain as { label: string }).label.trim().length > 0
    );

  return domainValid;
}

export function loadPersistedScope(): SearchScope {
  if (typeof window === "undefined") {
    return GLOBAL_SCOPE;
  }

  try {
    const raw = window.sessionStorage.getItem(SCOPE_STATE_STORAGE_KEY);
    if (!raw) {
      return GLOBAL_SCOPE;
    }

    const parsed = JSON.parse(raw) as unknown;
    return isSearchScope(parsed) ? parsed : GLOBAL_SCOPE;
  } catch {
    return GLOBAL_SCOPE;
  }
}

export function persistScope(scope: SearchScope): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (
      scope.mode === "global"
      && scope.folder === null
      && scope.tag === null
      && scope.domain === null
    ) {
      window.sessionStorage.removeItem(SCOPE_STATE_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(SCOPE_STATE_STORAGE_KEY, JSON.stringify(scope));
  } catch {
    // ignore storage failures
  }
}

export function loadScopeHistory(): ScopeHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.sessionStorage.getItem(SCOPE_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is ScopeHistoryEntry => {
        if (!entry || typeof entry !== "object") {
          return false;
        }

        const record = entry as Record<string, unknown>;
        return (
          typeof record.query === "string"
          && isSearchScope(record.scope)
          && typeof record.createdAt === "number"
          && Number.isFinite(record.createdAt)
        );
      })
      .slice(0, MAX_SCOPE_HISTORY);
  } catch {
    return [];
  }
}

export function persistScopeHistory(entries: ScopeHistoryEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      SCOPE_HISTORY_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_SCOPE_HISTORY)),
    );
  } catch {
    // ignore storage failures
  }
}

export function hasSeenScopeHint(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.sessionStorage.getItem(SCOPE_HINT_USED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markScopeHintSeen(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(SCOPE_HINT_USED_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

export function serializeScope(scope: SearchScope): string {
  const parts: string[] = [];
  if (scope.domain) {
    parts.push(`domain:${scope.domain.departmentId}:${scope.domain.semesterId}`);
  }
  if (scope.folder) {
    parts.push(`folder:${scope.folder.folderId}`);
  }
  if (scope.tag) {
    parts.push(`tag:${scope.tag.tagId}`);
  }
  if (scope.mode !== "global") {
    parts.push(`mode:${scope.mode}`);
  }
  return parts.join("|");
}

export function parseScopeFromSerialized(serialized: string | null): SearchScope {
  if (!serialized || serialized.trim().length === 0) {
    return GLOBAL_SCOPE;
  }

  const next = cloneScope(GLOBAL_SCOPE);
  const chunks = serialized.split("|").map((chunk) => chunk.trim()).filter(Boolean);
  for (const chunk of chunks) {
    if (chunk.startsWith("folder:")) {
      const folderId = chunk.slice("folder:".length).trim();
      if (folderId) {
        next.folder = { folderId, label: folderId };
      }
      continue;
    }
    if (chunk.startsWith("tag:")) {
      const tagId = chunk.slice("tag:".length).trim();
      if (tagId) {
        next.tag = { tagId, label: tagId };
      }
      continue;
    }
    if (chunk.startsWith("domain:")) {
      const [departmentId, semesterId] = chunk.slice("domain:".length).split(":");
      if (departmentId && semesterId) {
        next.domain = {
          departmentId: departmentId.trim().toUpperCase(),
          semesterId: semesterId.trim(),
          label: `${departmentId.trim().toUpperCase()} S${semesterId.trim()}`,
        };
      }
      continue;
    }
    if (chunk === "mode:actions") {
      next.mode = "actions";
      continue;
    }
    if (chunk === "mode:recents") {
      next.mode = "recents";
    }
  }

  return next;
}

export function writeScopeSummary(value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!value) {
      window.sessionStorage.removeItem(SCOPE_SUMMARY_STORAGE_KEY);
      window.dispatchEvent(
        new CustomEvent(SCOPE_SUMMARY_EVENT, { detail: { value: "" } }),
      );
      return;
    }
    window.sessionStorage.setItem(SCOPE_SUMMARY_STORAGE_KEY, value);
    window.dispatchEvent(
      new CustomEvent(SCOPE_SUMMARY_EVENT, { detail: { value } }),
    );
  } catch {
    // ignore
  }
}
