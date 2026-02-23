"use client";

import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  IconArrowLeft,
  IconBolt,
  IconCloudOff,
  IconClockHour4,
  IconDatabase,
  IconFile,
  IconFolder,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconTag,
  IconX,
} from "@tabler/icons-react";
import { Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { DEPARTMENT_MAP, getDepartmentName } from "@/lib/academic";
import { Button } from "@/components/ui/button";
import { FloatingDock } from "@/components/layout/FloatingDock";
import { HighlightedText } from "@/components/command/HighlightedText";
import { useAcademicContext } from "@/components/layout/AcademicContext";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandDispatcher } from "@/features/command/command.dispatcher";
import { type CommandContext } from "@/features/command/command.context";
import {
  buildNestedCommandScopeKey,
  getNestedCommandSnapshot,
  setNestedCommandSnapshot,
  type NestedCommandFileEntry,
} from "@/features/command/command.localIndex";
import { buildCommandIndex } from "@/features/command/command.index";
import { CommandService } from "@/features/command/command.service";
import {
  FOLDER_QUERY_MIN_LENGTH,
  buildFolderSearchIndex,
  searchFoldersWithIndex,
} from "@/features/command/searchFolders";
import { useCatalog } from "@/features/catalog/catalog.hooks";
import { startDownload } from "@/features/download/download.controller";
import { useMotionTokens } from "@/features/motion/motion.tokens";
import {
  type CommandGroup as EngineCommandGroup,
  type CommandItem as EngineCommandItem,
} from "@/features/command/command.types";
import { type Course } from "@/features/catalog/catalog.types";
import {
  type DriveItem,
  formatFileSize,
  getMimeLabel,
  isDriveFolder,
} from "@/features/drive/drive.types";
import { openLocalFirst } from "@/features/offline/offline.access";
import { useOfflineIndexStore } from "@/features/offline/offline.index.store";
import {
  isOfflineLibraryRoute,
  navigateToOfflineLibrary,
  resolveOfflineLibraryRoute,
} from "@/features/offline/offline.routes";
import { useTagStore } from "@/features/tags/tag.store";
import { useDownloadStore } from "@/features/download/download.store";
import {
  loadOfflineLibrarySnapshot,
  type OfflineLibrarySnapshot,
} from "@/features/offline/offline.library";
import { buildNestedRootSignature } from "@/features/offline/offline.query-cache.keys";
import {
  buildFolderRouteHref,
  parseFolderTrailParam,
  FOLDER_TRAIL_IDS_QUERY_PARAM,
  FOLDER_TRAIL_QUERY_PARAM,
} from "@/features/navigation/folder-trail";
import { useSetting } from "@/ui/hooks/useSettings";
import {
  normalizeStickyPrefixInput,
  type PrefixMode,
} from "@/features/command/command.prefix";
import {
  type EssentialScopeAction,
  isEssentialActionActive,
  resolveEssentialScopeTransition,
  shouldShowEssentialScopeBar,
} from "@/features/command/command.scope-ui";
import { useDownloadRiskGate } from "@/ui/hooks/useDownloadRiskGate";
import { SmartSearchIndicator } from "@/components/intelligence/SmartSearchIndicator";
import { getIntelligenceClient, buildIntelligenceSnapshotKey, fetchIntelligenceModelCatalog } from "@/features/intelligence/intelligence.client";
import { buildSemanticDocuments, buildSemanticSignature, mapSemanticHitsById } from "@/features/intelligence/intelligence.command";
import { mergeSemanticKeywordResults } from "@/features/intelligence/intelligence.merge";
import { expandSemanticQuery } from "@/features/intelligence/intelligence.synonyms";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import { shouldMergeSemanticResults, shouldRunSemanticQuery, shouldSuppressDuplicateDetection } from "@/features/intelligence/intelligence.fallbacks";
import { INTELLIGENCE_SETTINGS_IDS, INTELLIGENCE_QUERY_DEBOUNCE_MS, INTELLIGENCE_QUERY_TIMEOUT_MS } from "@/features/intelligence/intelligence.constants";
import { readDeviceClassHints, resolveAutoModelId } from "@/features/intelligence/intelligence.model-selector";
import type { IntelligenceSearchHit, IntelligenceWorkerStats } from "@/features/intelligence/intelligence.types";

type CommandBarProps = {
  placeholder?: string;
};

const GROUP_ORDER: EngineCommandGroup[] = [
  "navigation",
  "folders",
  "files",
  "actions",
  "system",
];

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const GROUP_META: Record<
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

const DEPARTMENT_SEGMENT_PATTERN = /^[A-Z]{2,5}$/;
const RECENT_QUERY_STORAGE_KEY = "studytrix.command.recentQueries.v1";
const MAX_RECENT_QUERIES = 6;
const RECENT_COMMAND_STORAGE_KEY = "studytrix.command.recentCommands.v1";
const MAX_RECENT_COMMANDS = 24;
const SCOPE_STATE_STORAGE_KEY = "studytrix.command.scope.v1";
const SCOPE_HISTORY_STORAGE_KEY = "studytrix.command.scopeHistory.v1";
const MAX_SCOPE_HISTORY = 20;
const SCOPE_HINT_USED_KEY = "studytrix.command.scopeHintUsed.v1";
const SCOPE_SUMMARY_STORAGE_KEY = "studytrix.command.scopeSummary.v1";
const SCOPE_SUMMARY_EVENT = "studytrix:command-scope-summary";
const CMD_QUERY_PARAM = "cmd";
const CMD_SCOPE_PARAM = "scope";
const CMD_TEXT_PARAM = "q";
const NESTED_INDEX_TTL_MS = 30 * 60 * 1000;
const EMPTY_OFFLINE_LIBRARY: OfflineLibrarySnapshot = {
  files: [],
  folders: [],
  totalBytes: 0,
};

type SearchScope = {
  mode: "global" | "actions" | "recents";
  folder: { folderId: string; label: string } | null;
  tag: { tagId: string; label: string } | null;
  domain: { departmentId: string; semesterId: string; label: string } | null;
};

type ScopeSelectorMode = "folders" | "tags" | "domains";

type ScopeHistoryEntry = {
  query: string;
  scope: SearchScope;
  createdAt: number;
};

const GLOBAL_SCOPE: SearchScope = {
  mode: "global",
  folder: null,
  tag: null,
  domain: null,
};

const ESSENTIAL_SCOPE_ACTIONS: Array<{
  key: EssentialScopeAction;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "folder", label: "Folder", icon: IconFolder },
  { key: "tag", label: "Tag", icon: IconTag },
  { key: "actions", label: "Actions", icon: IconBolt },
  { key: "clear", label: "Clear", icon: IconX },
];

function resolvePrefixModeDescriptor(mode: PrefixMode | null): {
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

function toScopeSelectorMode(mode: PrefixMode | null): ScopeSelectorMode | null {
  if (mode === "folders" || mode === "tags" || mode === "domains") {
    return mode;
  }

  return null;
}

function isScopeEmpty(scope: SearchScope): boolean {
  return (
    scope.mode === "global"
    && scope.folder === null
    && scope.tag === null
    && scope.domain === null
  );
}

function cloneScope(scope: SearchScope): SearchScope {
  return {
    mode: scope.mode,
    folder: scope.folder ? { ...scope.folder } : null,
    tag: scope.tag ? { ...scope.tag } : null,
    domain: scope.domain ? { ...scope.domain } : null,
  };
}

type NestedRootPayload = {
  folderId: string;
  courseCode: string;
  courseName: string;
};

function titleCaseSegment(value: string): string {
  return decodeURIComponent(value)
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseSemesterId(value: string): number | null {
  const parsed = Number.parseInt(value.match(/\d+/)?.[0] ?? value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    return null;
  }
  return parsed;
}

function getCourseSubtitle(course: Course): string {
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

function parseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

function parseNestedFileEntries(payload: unknown): NestedCommandFileEntry[] {
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

function getCommandIcon(item: EngineCommandItem): ComponentType<{ className?: string }> {
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

function getCommandIconTone(item: EngineCommandItem): string {
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

function vibrate(duration = 8): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

function getContentBadge(item: EngineCommandItem): string | null {
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

function loadRecentQueries(): string[] {
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

function persistRecentQueries(queries: string[]): void {
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

function loadRecentCommandIds(): string[] {
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

function persistRecentCommandIds(commandIds: string[]): void {
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

function isSearchScope(value: unknown): value is SearchScope {
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

function loadPersistedScope(): SearchScope {
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

function persistScope(scope: SearchScope): void {
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

function loadScopeHistory(): ScopeHistoryEntry[] {
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

function persistScopeHistory(entries: ScopeHistoryEntry[]): void {
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

function hasSeenScopeHint(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.sessionStorage.getItem(SCOPE_HINT_USED_KEY) === "1";
  } catch {
    return true;
  }
}

function markScopeHintSeen(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(SCOPE_HINT_USED_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

function serializeScope(scope: SearchScope): string {
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

function parseScopeFromSerialized(serialized: string | null): SearchScope {
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

function writeScopeSummary(value: string): void {
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

export function CommandBar({
  placeholder = "Search files, folders, or actions...",
}: CommandBarProps) {
  const gateDownloadRisk = useDownloadRiskGate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { department: dashboardDepartment, semester: dashboardSemester } =
    useAcademicContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>(GLOBAL_SCOPE);
  const [scopeSelectorMode, setScopeSelectorMode] = useState<ScopeSelectorMode | null>(null);
  const [stickyPrefixMode, setStickyPrefixMode] = useState<PrefixMode | null>(null);
  const [scopeHistory, setScopeHistory] = useState<ScopeHistoryEntry[]>([]);
  const [scopeHistoryCursor, setScopeHistoryCursor] = useState(-1);
  const [isScopeHintSeen, setIsScopeHintSeen] = useState(true);
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [, setRecentQueries] = useState<string[]>([]);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([]);
  const [nestedFileEntries, setNestedFileEntries] = useState<NestedCommandFileEntry[]>([]);
  const [offlineLibrary, setOfflineLibrary] = useState<OfflineLibrarySnapshot>(EMPTY_OFFLINE_LIBRARY);
  const [nestedIndexUpdatedAt, setNestedIndexUpdatedAt] = useState(0);
  const [isNestedSnapshotHydrated, setIsNestedSnapshotHydrated] = useState(false);
  const [isNestedIndexing, setIsNestedIndexing] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [viewportMetrics, setViewportMetrics] = useState({
    height: 0,
    width: 0,
    offsetTop: 0,
    keyboardInset: 0,
  });
  const offlineFiles = useOfflineIndexStore((state) => state.snapshot.offlineFiles);
  const motionTokens = useMotionTokens();
  const listRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);
  const urlSyncRef = useRef("");
  const urlApplyRef = useRef("");
  const [activeIndex, setActiveIndex] = useState(0);
  const tags = useTagStore((state) => state.tags);
  const assignments = useTagStore((state) => state.assignments);
  const activeTagFilters = useTagStore((state) => state.activeFilters);
  const isTagHydrated = useTagStore((state) => state.isHydrated);
  const hydrateTags = useTagStore((state) => state.hydrate);
  const downloadTasks = useDownloadStore((state) => state.tasks);
  const [searchDebounceSetting] = useSetting("search_debounce");
  const [fuzzySearchEnabledSetting] = useSetting("fuzzy_search_enabled");
  const [resultLimitSetting] = useSetting("result_limit");
  const [debugCommandScoringSetting] = useSetting("debug_command_scoring");
  const [smartSearchEnabledSetting] = useSetting(INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled);
  const [intelligenceOcrEnabledSetting] = useSetting(INTELLIGENCE_SETTINGS_IDS.ocrEnabled);
  const [intelligenceDuplicateDetectionEnabledSetting] = useSetting(INTELLIGENCE_SETTINGS_IDS.duplicateDetectionEnabled);
  const [intelligenceModelModeSetting] = useSetting(INTELLIGENCE_SETTINGS_IDS.modelMode);
  const [intelligenceModelIdSetting, setIntelligenceModelIdSetting] = useSetting(INTELLIGENCE_SETTINGS_IDS.modelId);
  const [intelligenceSemanticWeightSetting] = useSetting(INTELLIGENCE_SETTINGS_IDS.semanticWeight);
  const searchDebounceMs = useMemo(() => {
    const raw = typeof searchDebounceSetting === "number" ? searchDebounceSetting : 40;
    return Math.max(20, Math.min(250, Math.round(raw)));
  }, [searchDebounceSetting]);
  const fuzzySearchEnabled = fuzzySearchEnabledSetting !== false;
  const resultLimit = useMemo(() => {
    const parsed = Number.parseInt(String(resultLimitSetting ?? "50"), 10);
    if (parsed === 20 || parsed === 50 || parsed === 100) {
      return parsed;
    }
    return 50;
  }, [resultLimitSetting]);
  const debugCommandScoring = debugCommandScoringSetting === true;
  const intelligenceSmartSearchSettingEnabled = smartSearchEnabledSetting === true;
  // Session-only override for the CommandCenter sparkle toggle. This intentionally
  // does not persist to settings, so app-level settings apply again on next app boot.
  const [sessionSmartSearchOverride, setSessionSmartSearchOverride] = useState<boolean | null>(null);
  const intelligenceSmartSearchEnabled =
    sessionSmartSearchOverride ?? intelligenceSmartSearchSettingEnabled;
  const intelligenceModelMode = intelligenceModelModeSetting === "manual" ? "manual" : "auto";
  const intelligenceOcrEnabled = intelligenceOcrEnabledSetting === true;
  const intelligenceDuplicateDetectionEnabled = intelligenceDuplicateDetectionEnabledSetting === true;
  const intelligenceManualModelId =
    typeof intelligenceModelIdSetting === "string" && intelligenceModelIdSetting.trim().length > 0
      ? intelligenceModelIdSetting
      : "Xenova/all-MiniLM-L6-v2";
  const intelligenceSemanticWeight = useMemo(() => {
    const raw = typeof intelligenceSemanticWeightSetting === "number"
      ? intelligenceSemanticWeightSetting
      : 60;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, [intelligenceSemanticWeightSetting]);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [semanticQueryInput, setSemanticQueryInput] = useState("");
  const [semanticHitScores, setSemanticHitScores] = useState<Map<string, number>>(new Map());
  const [semanticQueryPending, setSemanticQueryPending] = useState(false);
  const [semanticQueryTimedOut, setSemanticQueryTimedOut] = useState(false);
  const [semanticQueryError, setSemanticQueryError] = useState<string | null>(null);
  const [sparkleTooltipText, setSparkleTooltipText] = useState<string | null>(null);
  const sparkleTooltipTimerRef = useRef<number | null>(null);
  const [showExperimentalNotice, setShowExperimentalNotice] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }
    try {
      return window.localStorage.getItem("studytrix.smartsearch.noticeDismissed") !== "1";
    } catch {
      return true;
    }
  });
  const [hasActivatedSmartSearchSession, setHasActivatedSmartSearchSession] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<{ processed: number; total: number } | null>(null);
  const [modelDownloadProgress, setModelDownloadProgress] = useState<{ remainingMb: number; totalMb: number } | null>(null);
  const [newlyAppearedSemanticIds, setNewlyAppearedSemanticIds] = useState<Set<string>>(new Set());
  const previousSemanticIdsRef = useRef<Set<string>>(new Set());
  const semanticEnterTimerRef = useRef<number | null>(null);
  const duplicateDetectionRunRef = useRef("");
  const intelligenceClientRef = useRef(getIntelligenceClient());
  const semanticQuerySeqRef = useRef(0);
  const setIntelligenceEnabled = useIntelligenceStore((state) => state.setEnabled);
  const setIntelligenceRuntimeStatus = useIntelligenceStore((state) => state.setRuntimeStatus);
  const setIntelligenceCatalog = useIntelligenceStore((state) => state.setCatalog);
  const setIntelligenceModel = useIntelligenceStore((state) => state.setModel);
  const setIntelligenceIndexStats = useIntelligenceStore((state) => state.setIndexStats);
  const setIntelligenceIndexing = useIntelligenceStore((state) => state.setIndexing);
  const setIntelligenceDuplicates = useIntelligenceStore((state) => state.setDuplicates);
  const clearIntelligenceDuplicates = useIntelligenceStore((state) => state.clearDuplicates);
  const intelligenceRuntimeStatus = useIntelligenceStore((state) => state.runtimeStatus);
  const intelligenceIndexing = useIntelligenceStore((state) => state.indexing);
  const intelligenceIndexedDocs = useIntelligenceStore((state) => state.indexedDocs);
  const intelligenceCatalog = useIntelligenceStore((state) => state.catalog);

  const pathSegments = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname],
  );

  const pathDepartment = pathSegments[0]?.toUpperCase();
  const pathSemester = pathSegments[1];
  const parsedPathSemester = pathSemester ? parseSemesterId(pathSemester) : null;
  const isAcademicPath =
    Boolean(pathDepartment) &&
    DEPARTMENT_SEGMENT_PATTERN.test(pathDepartment) &&
    parsedPathSemester !== null;

  const departmentId = isAcademicPath
    ? (pathDepartment as string)
    : dashboardDepartment.toUpperCase();
  const effectiveSemester = isAcademicPath
    ? (parsedPathSemester as number)
    : dashboardSemester;
  const semesterId = String(effectiveSemester);
  const folderId = isAcademicPath ? pathSegments[2] : undefined;
  const isFolderScope = Boolean(folderId);

  const {
    courses: catalogCourses,
    isLoading: isCatalogLoading,
  } = useCatalog(departmentId, effectiveSemester);
  const nestedRoots = useMemo<NestedRootPayload[]>(
    () =>
      catalogCourses
        .map((course) => ({
          folderId: course.driveFolderId,
          courseCode: course.courseCode.toUpperCase(),
          courseName: course.courseName,
        }))
        .filter((root) => root.folderId.length > 0),
    [catalogCourses],
  );
  const nestedRootSignature = useMemo(
    () => buildNestedRootSignature(nestedRoots),
    [nestedRoots],
  );
  const nestedScopeKey = useMemo(
    () => buildNestedCommandScopeKey(departmentId, semesterId),
    [departmentId, semesterId],
  );

  const activeDriveFolderId = useMemo(() => {
    if (!folderId) {
      return null;
    }

    const course = catalogCourses.find(
      (item) => item.courseCode === folderId || item.driveFolderId === folderId,
    );

    return course?.driveFolderId ?? folderId;
  }, [catalogCourses, folderId]);
  const activeTrailLabels = useMemo(() => {
    const labels = parseFolderTrailParam(searchParams.get(FOLDER_TRAIL_QUERY_PARAM));
    if (labels.length > 0) {
      return labels;
    }

    const fallbackLabel = parseString(searchParams.get("name"));
    if (fallbackLabel) {
      return [fallbackLabel];
    }

    return [];
  }, [searchParams]);
  const activeTrailIds = useMemo(() => {
    const ids = parseFolderTrailParam(searchParams.get(FOLDER_TRAIL_IDS_QUERY_PARAM));
    if (ids.length > 0) {
      return ids;
    }

    if (activeDriveFolderId) {
      return [activeDriveFolderId];
    }

    return [];
  }, [activeDriveFolderId, searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, searchDebounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query, searchDebounceMs]);

  useEffect(() => {
    if (!intelligenceSmartSearchEnabled) {
      setSemanticQueryInput("");
      setSemanticHitScores(new Map());
      setSemanticQueryPending(false);
      setSemanticQueryTimedOut(false);
      setSemanticQueryError(null);
      setIndexingProgress(null);
      return;
    }

    const normalized = debouncedQuery.trim();
    if (!normalized) {
      setSemanticQueryInput("");
      setSemanticHitScores(new Map());
      setSemanticQueryPending(false);
      setSemanticQueryTimedOut(false);
      setSemanticQueryError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setSemanticQueryInput(normalized);
    }, INTELLIGENCE_QUERY_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [debouncedQuery, intelligenceSmartSearchEnabled]);

  useEffect(() => {
    if (intelligenceSmartSearchEnabled) {
      setHasActivatedSmartSearchSession(true);
    }
  }, [intelligenceSmartSearchEnabled]);

  useEffect(() => () => {
    if (sparkleTooltipTimerRef.current !== null) {
      window.clearTimeout(sparkleTooltipTimerRef.current);
    }
    if (semanticEnterTimerRef.current !== null) {
      window.clearTimeout(semanticEnterTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isFolderScope || !activeDriveFolderId) {
      setDriveItems([]);
      setIsDriveLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsDriveLoading(true);

    const run = async () => {
      try {
        const response = await fetch(
          `/api/drive/${encodeURIComponent(activeDriveFolderId)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch drive items");
        }

        const data = (await response.json()) as { items?: DriveItem[] };
        if (!controller.signal.aborted) {
          setDriveItems(data.items ?? []);
          setIsDriveLoading(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setDriveItems([]);
          setIsDriveLoading(false);
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [activeDriveFolderId, isFolderScope]);

  useEffect(() => {
    let cancelled = false;
    setNestedFileEntries([]);
    setNestedIndexUpdatedAt(0);
    setIsNestedSnapshotHydrated(false);

    void (async () => {
      const snapshot = await getNestedCommandSnapshot(nestedScopeKey);
      if (cancelled) {
        return;
      }

      if (!snapshot || snapshot.rootSignature !== nestedRootSignature) {
        setIsNestedSnapshotHydrated(true);
        return;
      }

      setNestedFileEntries(snapshot.entries);
      setNestedIndexUpdatedAt(snapshot.updatedAt);
      setIsNestedSnapshotHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [nestedRootSignature, nestedScopeKey]);

  useEffect(() => {
    if (isCatalogLoading) {
      return;
    }

    if (!isNestedSnapshotHydrated) {
      return;
    }

    if (nestedRoots.length === 0) {
      setIsNestedIndexing(false);
      setNestedFileEntries([]);
      const updatedAt = Date.now();
      setNestedIndexUpdatedAt(updatedAt);
      void setNestedCommandSnapshot({
        scopeKey: nestedScopeKey,
        rootSignature: nestedRootSignature,
        updatedAt,
        entries: [],
      });
      return;
    }

    const isStale =
      nestedIndexUpdatedAt <= 0
      || Date.now() - nestedIndexUpdatedAt > NESTED_INDEX_TTL_MS;
    if (!isStale) {
      setIsNestedIndexing(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setIsNestedIndexing(true);

    void (async () => {
      try {
        const response = await fetch("/api/drive/nested-index", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ roots: nestedRoots }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to build nested file index");
        }

        const payload = (await response.json()) as unknown;
        if (controller.signal.aborted) {
          return;
        }

        const entries = parseNestedFileEntries(payload);
        const updatedAt = Date.now();

        setNestedFileEntries(entries);
        setNestedIndexUpdatedAt(updatedAt);

        await setNestedCommandSnapshot({
          scopeKey: nestedScopeKey,
          rootSignature: nestedRootSignature,
          updatedAt,
          entries,
        });
      } catch {
        // Keep using cached snapshot on failure.
      } finally {
        if (!controller.signal.aborted && !cancelled) {
          setIsNestedIndexing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    isCatalogLoading,
    isNestedSnapshotHydrated,
    nestedIndexUpdatedAt,
    nestedRootSignature,
    nestedRoots,
    nestedScopeKey,
  ]);

  useEffect(() => {
    let cancelled = false;

    const refreshOfflineLibrary = async () => {
      try {
        const snapshot = await loadOfflineLibrarySnapshot({
          force: open,
          maxAgeMs: open ? 8_000 : 20_000,
        });
        if (!cancelled) {
          setOfflineLibrary(snapshot);
        }
      } catch {
        if (!cancelled) {
          setOfflineLibrary(EMPTY_OFFLINE_LIBRARY);
        }
      }
    };

    void refreshOfflineLibrary();

    if (!open) {
      return () => {
        cancelled = true;
      };
    }

    return () => {
      cancelled = true;
    };
  }, [open, offlineFiles]);

  const activeFolderTitle = useMemo(() => {
    if (!folderId) {
      return "Dashboard";
    }

    const titleFromQuery = searchParams.get("name");
    if (titleFromQuery) {
      return titleFromQuery;
    }

    const course = catalogCourses.find(
      (item) => item.courseCode === folderId || item.driveFolderId === folderId,
    );
    if (course) {
      return course.courseName;
    }

    return titleCaseSegment(folderId);
  }, [catalogCourses, folderId, searchParams]);

  const markScopeUsage = useCallback(() => {
    if (isScopeHintSeen) {
      return;
    }

    setIsScopeHintSeen(true);
    markScopeHintSeen();
  }, [isScopeHintSeen]);

  const applyScope = useCallback((scope: SearchScope) => {
    const nextScope = cloneScope(scope);
    setSearchScope(nextScope);
    persistScope(nextScope);
    setScopeHistoryCursor(-1);
    if (!isScopeEmpty(nextScope)) {
      markScopeUsage();
    }
  }, [markScopeUsage]);

  const clearStickyPrefixMode = useCallback(() => {
    if (stickyPrefixMode === "actions" || stickyPrefixMode === "recents") {
      applyScope({ ...searchScope, mode: "global" });
    }
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
  }, [applyScope, searchScope, stickyPrefixMode]);

  const activatePrefixMode = useCallback((mode: PrefixMode) => {
    setStickyPrefixMode(mode);
    setScopeHistoryCursor(-1);
    setQuery("");
    markScopeUsage();

    const selectorMode = toScopeSelectorMode(mode);
    setScopeSelectorMode(selectorMode);

    if (mode === "actions") {
      applyScope({ ...searchScope, mode: "actions" });
      return;
    }

    if (mode === "recents") {
      applyScope({ ...searchScope, mode: "recents" });
      return;
    }

    if (searchScope.mode !== "global") {
      applyScope({ ...searchScope, mode: "global" });
    }
  }, [applyScope, markScopeUsage, searchScope]);

  const handleClearSearchAndScope = useCallback(() => {
    setQuery("");
    setScopeHistoryCursor(-1);
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
    applyScope(GLOBAL_SCOPE);
  }, [applyScope]);

  const removeLastScopePill = useCallback(() => {
    if (searchScope.mode !== "global") {
      applyScope({ ...searchScope, mode: "global" });
      return;
    }

    if (searchScope.tag) {
      applyScope({ ...searchScope, tag: null });
      return;
    }

    if (searchScope.folder) {
      applyScope({ ...searchScope, folder: null });
      return;
    }

    if (searchScope.domain) {
      applyScope({ ...searchScope, domain: null });
    }
  }, [applyScope, searchScope]);

  const pushScopeHistory = useCallback((value: string, scope: SearchScope) => {
    const normalizedQuery = value.trim();
    if (!normalizedQuery && isScopeEmpty(scope)) {
      return;
    }

    const nextEntry: ScopeHistoryEntry = {
      query: normalizedQuery,
      scope: cloneScope(scope),
      createdAt: Date.now(),
    };

    setScopeHistory((current) => {
      const deduped = current.filter((entry) =>
        !(entry.query === nextEntry.query && JSON.stringify(entry.scope) === JSON.stringify(nextEntry.scope)));
      const next = [nextEntry, ...deduped].slice(0, MAX_SCOPE_HISTORY);
      persistScopeHistory(next);
      return next;
    });
    setScopeHistoryCursor(-1);
  }, []);

  const folderCommands = useMemo<EngineCommandItem[]>(() => {
    const baseCommands: EngineCommandItem[] = isFolderScope
      ? driveItems.filter(isDriveFolder).map((item) => ({
        id: `folder-${item.id}`,
        title: item.name,
        subtitle: "Folder",
        keywords: ["folder", "open"],
        group: "folders",
        scope: "folder",
        entityId: item.id,
        payload: {
          route: buildFolderRouteHref({
            departmentId,
            semesterId,
            folderId: item.id,
            folderName: item.name,
            trailLabels: [...activeTrailLabels, item.name],
            trailIds: [...activeTrailIds, item.id],
          }),
          ancestorFolderIds: [activeDriveFolderId ?? folderId ?? null].filter(Boolean),
          departmentId,
          semesterId,
        },
      }))
      : catalogCourses.map((course) => ({
        id: `folder-${course.courseCode}`,
        title: course.courseName,
        subtitle: getCourseSubtitle(course),
        keywords: ["course", "folder", course.courseCode],
        group: "folders",
        scope: "global",
        entityId: course.driveFolderId,
        payload: {
          route: buildFolderRouteHref({
            departmentId,
            semesterId,
            folderId: course.driveFolderId,
            folderName: course.courseName,
            trailLabels: [course.courseName],
            trailIds: [course.driveFolderId],
          }),
          departmentId,
          semesterId,
        },
      }));

    const commandByFolderId = new Map<string, EngineCommandItem>();
    const ordered: EngineCommandItem[] = [];

    const pushIfNew = (item: EngineCommandItem) => {
      const folderId = typeof item.entityId === "string" ? item.entityId : "";
      if (!folderId || commandByFolderId.has(folderId)) {
        return;
      }
      commandByFolderId.set(folderId, item);
      ordered.push(item);
    };

    for (const command of baseCommands) {
      pushIfNew(command);
    }

    const nestedFolderMap = new Map<string, {
      folderId: string;
      label: string;
      path: string;
      courseCode: string;
      ancestorFolderIds: string[];
    }>();
    for (const entry of nestedFileEntries) {
      const ancestryIds = entry.ancestorFolderIds.length > 0
        ? entry.ancestorFolderIds
        : [entry.parentFolderId];
      const ancestryNames = ancestryIds.map((_, index) =>
        entry.ancestorFolderNames[index] ?? entry.parentFolderName,
      );

      for (let index = 0; index < ancestryIds.length; index += 1) {
        const folderId = ancestryIds[index];
        if (!folderId || nestedFolderMap.has(folderId)) {
          continue;
        }

        const label = ancestryNames[index] ?? folderId;
        const path = ancestryNames.slice(0, index + 1).join(" / ") || label;
        nestedFolderMap.set(folderId, {
          folderId,
          label,
          path,
          courseCode: entry.courseCode,
          ancestorFolderIds: ancestryIds.slice(0, index + 1),
        });
      }
    }

    for (const option of nestedFolderMap.values()) {
      pushIfNew({
        id: `nested-folder-${option.folderId}`,
        title: option.label,
        subtitle: `${option.courseCode} · ${option.path}`,
        keywords: ["folder", "nested", option.courseCode, option.path, option.label],
        group: "folders",
        scope: "global",
        entityId: option.folderId,
        payload: {
          route: buildFolderRouteHref({
            departmentId,
            semesterId,
            folderId: option.folderId,
            folderName: option.label,
            trailLabels: option.path
              .split(" / ")
              .map((value) => value.trim())
              .filter((value) => value.length > 0),
            trailIds: option.ancestorFolderIds,
          }),
          ancestorFolderIds: option.ancestorFolderIds,
          departmentId,
          semesterId,
        },
      });
    }

    for (const folder of offlineLibrary.folders) {
      pushIfNew({
        id: `offline-folder-${folder.folderId}`,
        title: folder.path,
        subtitle: `${folder.fileCount} file${folder.fileCount === 1 ? "" : "s"} · Offline folder`,
        keywords: ["offline", "folder", folder.name, folder.path],
        group: "folders",
        scope: "global",
        entityId: folder.folderId,
        payload: {
          route: `/offline-library?folder=${encodeURIComponent(folder.folderId)}`,
          departmentId,
          semesterId,
        },
      });
    }

    return ordered;
  }, [
    activeDriveFolderId,
    activeTrailIds,
    activeTrailLabels,
    catalogCourses,
    departmentId,
    driveItems,
    folderId,
    isFolderScope,
    nestedFileEntries,
    offlineLibrary.folders,
    semesterId,
  ]);

  const folderScopeOptions = useMemo(() => {
    const courseOptions = catalogCourses
      .filter((course) => course.driveFolderId.trim().length > 0)
      .map((course) => ({
        folderId: course.driveFolderId,
        label: course.courseName,
        subtitle: course.courseCode,
      }));

    const known = new Set(courseOptions.map((item) => item.folderId));
    const offlineOnly = offlineLibrary.folders
      .filter((folder) => !known.has(folder.folderId))
      .map((folder) => ({
        folderId: folder.folderId,
        label: folder.path,
        subtitle: `${folder.fileCount} offline file${folder.fileCount === 1 ? "" : "s"}`,
      }));

    const knownOrOffline = new Set([...known, ...offlineOnly.map((item) => item.folderId)]);
    const nestedOnly: Array<{
      folderId: string;
      label: string;
      subtitle: string;
    }> = [];

    for (const entry of nestedFileEntries) {
      const ancestryIds = entry.ancestorFolderIds.length > 0
        ? entry.ancestorFolderIds
        : [entry.parentFolderId];
      const ancestryNames = ancestryIds.map((_, index) =>
        entry.ancestorFolderNames[index] ?? entry.parentFolderName,
      );

      for (let index = 0; index < ancestryIds.length; index += 1) {
        const folderId = ancestryIds[index];
        if (!folderId || knownOrOffline.has(folderId)) {
          continue;
        }

        const label = ancestryNames[index] ?? folderId;
        const path = ancestryNames.slice(0, index + 1).join(" / ") || label;
        nestedOnly.push({
          folderId,
          label,
          subtitle: `${entry.courseCode} · ${path}`,
        });
        knownOrOffline.add(folderId);
      }
    }

    return [...courseOptions, ...offlineOnly, ...nestedOnly];
  }, [catalogCourses, nestedFileEntries, offlineLibrary.folders]);

  const activeFolderFileCommands = useMemo<EngineCommandItem[]>(() => {
    if (!isFolderScope) {
      return [];
    }

    return driveItems
      .filter((item) => !isDriveFolder(item))
      .map((item) => ({
        id: `file-${item.id}`,
        title: item.name,
        subtitle:
          [formatFileSize(item.size), getMimeLabel(item.mimeType, item.name)]
            .filter(Boolean)
            .join(" · ") || "File",
        keywords: [
          "file",
          "open",
          "preview",
          getMimeLabel(item.mimeType, item.name),
        ],
        group: "files",
        scope: "folder",
        entityId: item.id,
        payload: {
          fileId: item.id,
          mimeType: item.mimeType,
          fullPath: `${activeTrailLabels.join(" / ") || activeTrailIds.join(" / ") || "Current folder"} / ${item.name}`,
          tags: [],
          url: item.webViewLink,
          parentFolderId: activeDriveFolderId ?? folderId ?? null,
          ancestorFolderIds: [activeDriveFolderId ?? folderId ?? null].filter(Boolean),
          departmentId,
          semesterId,
        },
      }));
  }, [activeDriveFolderId, activeTrailIds, activeTrailLabels, departmentId, driveItems, folderId, isFolderScope, semesterId]);

  const nestedFileCommands = useMemo<EngineCommandItem[]>(() => {
    return nestedFileEntries.map((entry) => {
      const mimeLabel = getMimeLabel(entry.mimeType, entry.name);
      const subtitle = [
        formatFileSize(entry.size),
        mimeLabel,
        `${entry.courseCode} · ${entry.path}`,
      ]
        .filter(Boolean)
        .join(" · ");

      const route = buildFolderRouteHref({
        departmentId,
        semesterId,
        folderId: entry.parentFolderId,
        folderName: entry.parentFolderName,
        trailLabels: entry.ancestorFolderNames,
        trailIds: entry.ancestorFolderIds,
      });

      return {
        id: `file-${entry.id}`,
        title: entry.name,
        subtitle: subtitle || "File",
        keywords: [
          "file",
          "open",
          "preview",
          mimeLabel,
          entry.courseCode,
          entry.courseName,
          entry.path,
          entry.parentFolderName,
        ],
        group: "files",
        scope: "global",
        entityId: entry.id,
        payload: {
          fileId: entry.id,
          mimeType: entry.mimeType,
          fullPath: `${entry.path} / ${entry.name}`,
          tags: [],
          url: entry.webViewLink,
          route,
          rootFolderId: entry.rootFolderId,
          ancestorFolderIds: entry.ancestorFolderIds,
          parentFolderId: entry.parentFolderId,
          departmentId,
          semesterId,
        },
      };
    });
  }, [departmentId, nestedFileEntries, semesterId]);

  const fileCommands = useMemo<EngineCommandItem[]>(() => {
    const merged = new Map<string, EngineCommandItem>();
    const seenEntityIds = new Set<string>();

    for (const item of nestedFileCommands) {
      merged.set(item.id, item);
      if (item.entityId) {
        seenEntityIds.add(item.entityId);
      }
    }

    for (const item of activeFolderFileCommands) {
      merged.set(item.id, item);
      if (item.entityId) {
        seenEntityIds.add(item.entityId);
      }
    }

    for (const file of offlineLibrary.files) {
      if (seenEntityIds.has(file.fileId)) {
        continue;
      }

      const mimeLabel = getMimeLabel(file.mimeType, file.name);
      const subtitle = [
        formatFileSize(file.size),
        mimeLabel,
        `${file.courseCode} · ${file.folderPath}`,
        "Offline",
      ]
        .filter(Boolean)
        .join(" · ");

      merged.set(`offline-file-${file.fileId}`, {
        id: `offline-file-${file.fileId}`,
        title: file.name,
        subtitle,
        keywords: [
          "offline",
          "file",
          "open",
          "local",
          mimeLabel,
          file.courseCode,
          file.folderName,
          file.folderPath,
        ],
        group: "files",
        scope: "global",
        entityId: file.fileId,
        payload: {
          fileId: file.fileId,
          mimeType: file.mimeType,
          fullPath: `${file.folderPath} / ${file.name}`,
          tags: [],
          route: `/offline-library?folder=${encodeURIComponent(file.folderId)}`,
          url: `/api/file/${encodeURIComponent(file.fileId)}/stream`,
          ancestorFolderIds: file.ancestorFolderIds,
          parentFolderId: file.folderId,
          departmentId,
          semesterId,
          offlineOnly: true,
        },
      });
      seenEntityIds.add(file.fileId);
    }

    return Array.from(merged.values());
  }, [activeFolderFileCommands, departmentId, nestedFileCommands, offlineLibrary.files, semesterId]);
  const semanticCommands = useMemo<EngineCommandItem[]>(
    () => [...folderCommands, ...fileCommands].filter((item) => item.group === "folders" || item.group === "files"),
    [fileCommands, folderCommands],
  );
  const semanticDocuments = useMemo(
    () => buildSemanticDocuments(semanticCommands),
    [semanticCommands],
  );
  const semanticCorpusSignature = useMemo(
    () => buildSemanticSignature(nestedScopeKey, semanticCommands.map((item) => item.id)),
    [nestedScopeKey, semanticCommands],
  );
  const resolvedIntelligenceModelId = useMemo(() => {
    if (!intelligenceCatalog) {
      return intelligenceModelMode === "manual" ? intelligenceManualModelId : null;
    }

    if (intelligenceModelMode === "manual") {
      return intelligenceManualModelId;
    }

    return resolveAutoModelId(intelligenceCatalog, readDeviceClassHints());
  }, [
    intelligenceCatalog,
    intelligenceManualModelId,
    intelligenceModelMode,
  ]);
  const intelligenceSnapshotKey = useMemo(
    () => resolvedIntelligenceModelId
      ? buildIntelligenceSnapshotKey(nestedScopeKey, resolvedIntelligenceModelId)
      : null,
    [nestedScopeKey, resolvedIntelligenceModelId],
  );

  useEffect(() => {
    if (intelligenceModelMode !== "auto" || !resolvedIntelligenceModelId) {
      return;
    }

    if (intelligenceManualModelId === resolvedIntelligenceModelId) {
      return;
    }

    setIntelligenceModelIdSetting(resolvedIntelligenceModelId);
  }, [
    intelligenceManualModelId,
    intelligenceModelMode,
    resolvedIntelligenceModelId,
    setIntelligenceModelIdSetting,
  ]);

  useEffect(() => {
    setIntelligenceEnabled(intelligenceSmartSearchEnabled);

    if (!intelligenceSmartSearchEnabled) {
      intelligenceClientRef.current.dispose();
      semanticQuerySeqRef.current += 1;
      duplicateDetectionRunRef.current = "";
      setIntelligenceRuntimeStatus("idle");
      setIntelligenceModel({ activeModelId: null, resolvedAutoModelId: null, usingHashedFallback: false });
      setIntelligenceIndexing(false);
      clearIntelligenceDuplicates();
      setSemanticHitScores(new Map());
      setSemanticQueryError(null);
      setSemanticQueryPending(false);
      setSemanticQueryTimedOut(false);
      return;
    }

    if (intelligenceCatalog) {
      return;
    }

    const controller = new AbortController();
    setIntelligenceRuntimeStatus("loading");

    void fetchIntelligenceModelCatalog(controller.signal)
      .then((catalog) => {
        setIntelligenceCatalog(catalog);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        setIntelligenceRuntimeStatus(
          "error",
          error instanceof Error ? error.message : "Failed to load intelligence model catalog",
        );
      });

    return () => {
      controller.abort();
    };
  }, [
    intelligenceCatalog,
    intelligenceSmartSearchEnabled,
    setIntelligenceCatalog,
    setIntelligenceEnabled,
    clearIntelligenceDuplicates,
    setIntelligenceIndexing,
    setIntelligenceModel,
    setIntelligenceRuntimeStatus,
  ]);

  useEffect(() => {
    if (!intelligenceSmartSearchEnabled || !resolvedIntelligenceModelId || !intelligenceSnapshotKey) {
      return;
    }

    let cancelled = false;
    setIntelligenceRuntimeStatus("loading");

    void (async () => {
      try {
        const stats = await intelligenceClientRef.current.init({
          modelId: resolvedIntelligenceModelId,
          snapshotKey: intelligenceSnapshotKey,
        });

        if (cancelled) {
          return;
        }

        setIntelligenceModel({
          activeModelId: stats.modelId,
          resolvedAutoModelId: intelligenceModelMode === "auto" ? resolvedIntelligenceModelId : undefined,
          usingHashedFallback: stats.usingHashedFallback,
        });
        setIntelligenceIndexStats({
          indexedDocs: stats.indexSize,
          lastIndexedAt: stats.updatedAt,
        });
        setIntelligenceRuntimeStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setIntelligenceRuntimeStatus(
          "error",
          error instanceof Error ? error.message : "Failed to initialize semantic search runtime",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    intelligenceModelMode,
    intelligenceSmartSearchEnabled,
    intelligenceSnapshotKey,
    resolvedIntelligenceModelId,
    setIntelligenceIndexStats,
    setIntelligenceModel,
    setIntelligenceRuntimeStatus,
  ]);

  useEffect(() => {
    if (
      !intelligenceSmartSearchEnabled
      || intelligenceRuntimeStatus !== "ready"
      || !resolvedIntelligenceModelId
      || !intelligenceSnapshotKey
    ) {
      return;
    }

    let cancelled = false;
    setIntelligenceIndexing(true);
    setIndexingProgress({
      processed: 0,
      total: semanticDocuments.length,
    });

    void intelligenceClientRef.current.indexDocs({
      docs: semanticDocuments,
      signature: semanticCorpusSignature,
      snapshotKey: intelligenceSnapshotKey,
      enableOCR: intelligenceOcrEnabled,
      onProgress: (progress) => {
        if (cancelled) {
          return;
        }
        setIndexingProgress(progress);
      },
    })
      .then((stats: IntelligenceWorkerStats) => {
        if (cancelled) {
          return;
        }

        setIntelligenceIndexStats({
          indexedDocs: stats.indexSize,
          lastIndexedAt: stats.updatedAt,
        });
        setIntelligenceModel({
          activeModelId: stats.modelId,
          usingHashedFallback: stats.usingHashedFallback,
        });
        setIndexingProgress((current) => {
          if (!current) {
            return current;
          }

          return {
            processed: current.total,
            total: current.total,
          };
        });
      })
      .catch(() => {
        if (!cancelled) {
          setIntelligenceRuntimeStatus("error", "Semantic indexing failed");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIntelligenceIndexing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    intelligenceRuntimeStatus,
    intelligenceSmartSearchEnabled,
    intelligenceOcrEnabled,
    intelligenceSnapshotKey,
    resolvedIntelligenceModelId,
    semanticCorpusSignature,
    semanticDocuments,
    setIndexingProgress,
    setIntelligenceIndexStats,
    setIntelligenceIndexing,
    setIntelligenceModel,
    setIntelligenceRuntimeStatus,
  ]);

  useEffect(() => {
    if (!intelligenceSmartSearchEnabled || !intelligenceSnapshotKey) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") {
        return;
      }

      void intelligenceClientRef.current.persist(intelligenceSnapshotKey).catch(() => undefined);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intelligenceSmartSearchEnabled, intelligenceSnapshotKey]);

  useEffect(() => intelligenceClientRef.current.subscribeEvents((event) => {
    if (event.type === "DUPLICATES_FOUND") {
      setIntelligenceDuplicates(event.pairs);
      return;
    }

    if (event.type === "MODEL_DOWNLOAD_PROGRESS" && event.pipeline === "embedding") {
      if (
        typeof event.totalBytes === "number"
        && Number.isFinite(event.totalBytes)
        && event.totalBytes > 0
        && typeof event.loadedBytes === "number"
        && Number.isFinite(event.loadedBytes)
      ) {
        const totalMb = event.totalBytes / (1024 * 1024);
        const loadedMb = event.loadedBytes / (1024 * 1024);
        setModelDownloadProgress({
          totalMb,
          remainingMb: Math.max(0, totalMb - loadedMb),
        });
      } else {
        setModelDownloadProgress(null);
      }
      return;
    }

    if (
      event.type === "MODEL_PIPELINE_STATUS"
      && event.pipeline === "embedding"
      && event.status !== "loading"
    ) {
      setModelDownloadProgress(null);
    }
  }), [setIntelligenceDuplicates]);

  useEffect(() => {
    if (
      !intelligenceSmartSearchEnabled
      || !intelligenceDuplicateDetectionEnabled
      || intelligenceRuntimeStatus !== "ready"
      || intelligenceIndexing
      || shouldSuppressDuplicateDetection()
    ) {
      return;
    }

    const runKey = `${intelligenceSnapshotKey ?? "none"}::${semanticCorpusSignature}::${semanticDocuments.length}`;
    if (duplicateDetectionRunRef.current === runKey) {
      return;
    }
    duplicateDetectionRunRef.current = runKey;

    let cancelled = false;
    let idleHandle = -1;
    const schedule = () => {
      if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(() => {
          void intelligenceClientRef.current.detectDuplicates()
            .then((result) => {
              if (!cancelled) {
                setIntelligenceDuplicates(result.pairs);
              }
            })
            .catch(() => undefined);
        }, { timeout: 1000 });
        return;
      }

      idleHandle = window.setTimeout(() => {
        void intelligenceClientRef.current.detectDuplicates()
          .then((result) => {
            if (!cancelled) {
              setIntelligenceDuplicates(result.pairs);
            }
          })
          .catch(() => undefined);
      }, 100);
    };

    schedule();

    return () => {
      cancelled = true;
      if (idleHandle >= 0) {
        if (typeof window !== "undefined" && typeof window.cancelIdleCallback === "function") {
          window.cancelIdleCallback(idleHandle);
        } else {
          window.clearTimeout(idleHandle);
        }
      }
    };
  }, [
    intelligenceDuplicateDetectionEnabled,
    intelligenceIndexing,
    intelligenceRuntimeStatus,
    intelligenceSmartSearchEnabled,
    intelligenceSnapshotKey,
    semanticCorpusSignature,
    semanticDocuments.length,
    setIntelligenceDuplicates,
  ]);

  useEffect(() => {
    if (!shouldRunSemanticQuery({
      enabled: intelligenceSmartSearchEnabled,
      runtimeStatus: intelligenceRuntimeStatus,
      query: semanticQueryInput,
    })) {
      return;
    }

    const sequenceId = semanticQuerySeqRef.current + 1;
    semanticQuerySeqRef.current = sequenceId;
    setSemanticQueryPending(true);
    setSemanticQueryTimedOut(false);
    setSemanticQueryError(null);
    setSemanticHitScores(new Map());

    void intelligenceClientRef.current.query({
      query: expandSemanticQuery(semanticQueryInput),
      limit: Math.max(resultLimit, 20),
      scopeSignature: semanticCorpusSignature,
      timeoutMs: INTELLIGENCE_QUERY_TIMEOUT_MS,
    })
      .then((response) => {
        if (semanticQuerySeqRef.current !== sequenceId) {
          return;
        }

        const mapped = mapSemanticHitsById(response.hits as IntelligenceSearchHit[]);
        setSemanticHitScores(mapped);
      })
      .catch((error) => {
        if (semanticQuerySeqRef.current !== sequenceId) {
          return;
        }

        const message = error instanceof Error ? error.message : "Semantic query failed";
        setSemanticQueryError(message);
        if (message.toLowerCase().includes("timeout")) {
          setSemanticQueryTimedOut(true);
        }
      })
      .finally(() => {
        if (semanticQuerySeqRef.current === sequenceId) {
          setSemanticQueryPending(false);
        }
      });
  }, [
    intelligenceRuntimeStatus,
    intelligenceSmartSearchEnabled,
    resultLimit,
    semanticCorpusSignature,
    semanticQueryInput,
  ]);

  useEffect(() => {
    if (intelligenceRuntimeStatus !== "loading") {
      setModelDownloadProgress(null);
    }
  }, [intelligenceRuntimeStatus]);

  const trimmedDeferredQuery = debouncedQuery.trim();
  const effectiveVisualQuery = scopeSelectorMode ? query.trim() : trimmedDeferredQuery;

  const taggedEntityIds = useMemo(() => {
    if (!searchScope.tag) {
      return new Set<string>();
    }

    const set = new Set<string>();
    for (const assignment of Object.values(assignments)) {
      if (assignment.tagIds.includes(searchScope.tag.tagId)) {
        set.add(assignment.entityId);
      }
    }
    return set;
  }, [assignments, searchScope]);

  const recentScopedFileIds = useMemo(() => {
    const ids = new Set<string>();
    const fileCommandById = new Map(fileCommands.map((item) => [item.id, item]));

    for (const commandId of recentCommandIds) {
      const command = fileCommandById.get(commandId);
      if (command?.entityId) {
        ids.add(command.entityId);
      }
    }

    for (const task of Object.values(downloadTasks)) {
      if (task.state === "completed" && task.fileId.trim().length > 0) {
        ids.add(task.fileId);
      }
    }

    return ids;
  }, [downloadTasks, fileCommands, recentCommandIds]);

  const domainScopeOptions = useMemo(() => {
    const options: Array<{
      departmentId: string;
      semesterId: string;
      label: string;
      subtitle: string;
    }> = [];

    for (const departmentKey of Object.keys(DEPARTMENT_MAP)) {
      const departmentName = getDepartmentName(departmentKey);
      for (let sem = 1; sem <= 8; sem += 1) {
        options.push({
          departmentId: departmentKey,
          semesterId: String(sem),
          label: `${departmentName} · Semester ${sem}`,
          subtitle: `${departmentKey} S${sem}`,
        });
      }
    }

    return options;
  }, []);

  const currentFolderScopeSuggestion = useMemo(() => {
    if (!isFolderScope || !activeDriveFolderId) {
      return null;
    }

    return {
      folderId: activeDriveFolderId,
      label: activeFolderTitle,
      subtitle: "Current folder",
    };
  }, [activeDriveFolderId, activeFolderTitle, isFolderScope]);

  const currentTagScopeSuggestion = useMemo(() => {
    const firstActive = activeTagFilters[0];
    if (!firstActive) {
      return null;
    }

    const tag = tags.find((item) => item.id === firstActive);
    if (!tag) {
      return null;
    }

    return tag;
  }, [activeTagFilters, tags]);

  const scopeSelectorItems = useMemo<EngineCommandItem[]>(() => {
    if (!scopeSelectorMode) {
      return [];
    }

    const needle = query.trim().toLowerCase();
    if (scopeSelectorMode === "folders") {
      const rankedOptions = folderScopeOptions
        .filter((option) => {
          if (!needle) {
            return true;
          }
          return (
            option.label.toLowerCase().includes(needle)
            || option.subtitle.toLowerCase().includes(needle)
          );
        });

      const ordered = [...rankedOptions];
      if (
        currentFolderScopeSuggestion
        && !ordered.some((option) => option.folderId === currentFolderScopeSuggestion.folderId)
      ) {
        ordered.unshift(currentFolderScopeSuggestion);
      }

      return ordered.slice(0, 30).map((option) => ({
          id: `scope-folder-${option.folderId}`,
          title: option.label,
          subtitle: option.subtitle,
          keywords: ["scope", "folder", option.subtitle],
          group: "folders",
          scope: "global",
          entityId: option.folderId,
          payload: {
            scopeKind: "folder",
            folderId: option.folderId,
            label: option.label,
          },
        }));
    }

    if (scopeSelectorMode === "tags") {
      const rankedTags = tags.filter((tag) => {
        if (!needle) {
          return true;
        }
        return tag.name.toLowerCase().includes(needle);
      });

      const orderedTags = [...rankedTags];
      if (
        currentTagScopeSuggestion
        && !orderedTags.some((tag) => tag.id === currentTagScopeSuggestion.id)
      ) {
        orderedTags.unshift(currentTagScopeSuggestion);
      }

      return orderedTags.slice(0, 30).map((tag) => ({
        id: `scope-tag-${tag.id}`,
        title: `#${tag.name}`,
        subtitle: `${tag.uses} use${tag.uses === 1 ? "" : "s"}`,
        keywords: ["scope", "tag", tag.name],
        group: "actions",
        scope: "global",
        payload: {
          scopeKind: "tag",
          tagId: tag.id,
          label: tag.name,
        },
      }));
    }

    return domainScopeOptions
      .filter((option) => {
        if (!needle) {
          return true;
        }

        return (
          option.label.toLowerCase().includes(needle)
          || option.subtitle.toLowerCase().includes(needle)
          || option.departmentId.toLowerCase().includes(needle)
          || option.semesterId.toLowerCase().includes(needle)
        );
      })
      .slice(0, 30)
      .map((option) => ({
        id: `scope-domain-${option.departmentId}-${option.semesterId}`,
        title: option.label,
        subtitle: option.subtitle,
        keywords: ["scope", "department", "semester", option.departmentId, option.semesterId],
        group: "navigation",
        scope: "global",
        payload: {
          scopeKind: "domain",
          departmentId: option.departmentId,
          semesterId: option.semesterId,
          label: option.label,
        },
      }));
  }, [
    currentFolderScopeSuggestion,
    currentTagScopeSuggestion,
    domainScopeOptions,
    folderScopeOptions,
    query,
    scopeSelectorMode,
    tags,
  ]);

  const folderCommandById = useMemo(
    () => new Map(folderCommands.map((item) => [item.id, item])),
    [folderCommands],
  );

  const folderSearchIndex = useMemo(() => {
    const folderSearchItems = folderCommands.map((item) => {
      const route =
        typeof item.payload?.route === "string" ? item.payload.route : "";

      return {
        id: item.id,
        name: item.title,
        path: [item.subtitle, route].filter(Boolean).join(" "),
      };
    });

    return buildFolderSearchIndex(folderSearchItems);
  }, [folderCommands]);

  const fuzzyFolderResults = useMemo<EngineCommandItem[]>(() => {
    if (!fuzzySearchEnabled) {
      return [];
    }

    const normalizedQuery = debouncedQuery.trim();
    if (normalizedQuery.length < FOLDER_QUERY_MIN_LENGTH) {
      return [];
    }

    const hits = searchFoldersWithIndex(normalizedQuery, folderSearchIndex, resultLimit);

    return hits
      .map((hit) => {
        const command = folderCommandById.get(hit.folder.id);
        if (!command) {
          return null;
        }

        const score =
          hit.rank === "exact"
            ? 160
            : hit.rank === "prefix"
              ? 130
              : Math.max(82, Math.round((1 - hit.fuseScore) * 100));

        return {
          ...command,
          score,
        } as EngineCommandItem;
      })
      .filter((item): item is EngineCommandItem => item !== null);
  }, [debouncedQuery, folderCommandById, folderSearchIndex, fuzzySearchEnabled, resultLimit]);

  const commandContext = useMemo<CommandContext>(() => {
    return {
      departmentId,
      semesterId,
      folderId: activeDriveFolderId ?? folderId,
      pinnedIds: [],
      recentIds: [],
    };
  }, [activeDriveFolderId, departmentId, folderId, semesterId]);

  const commandService = useMemo(() => {
    const index = buildCommandIndex(
      folderCommands,
      fileCommands,
      isFolderScope ? "folder" : "global",
    );
    return new CommandService(index);
  }, [fileCommands, folderCommands, isFolderScope]);

  const dispatcher = useMemo(() => {
    const registry = new CommandDispatcher();
    registry.register("go-back", () => router.back());
    registry.register("open-settings", () => router.push("/settings"));
    registry.register("open-storage", () => router.push("/storage"));
    registry.register("open-offline-library", () => {
      navigateToOfflineLibrary((route) => router.push(route));
    });
    registry.register("toggle-view", () => undefined);
    registry.register("mark-offline", (item) => {
      const entityId = item.entityId;
      if (!entityId) {
        return;
      }

      void (async () => {
        const proceed = await gateDownloadRisk(
          [
            {
              id: entityId,
              name: item.title,
              sizeBytes:
                typeof item.payload?.size === "number"
                  ? item.payload.size
                  : null,
              kind: "file",
            },
          ],
          {
            actionLabel: "offline save",
            confirmButtonLabel: "Save Offline",
          },
        );
        if (!proceed) {
          return;
        }

        await startDownload(entityId);
      })();
    });
    return registry;
  }, [gateDownloadRisk, router]);

  const matchesScopedFilters = useCallback((item: EngineCommandItem): boolean => {
    if (searchScope.mode === "actions") {
      return item.group === "actions" || item.group === "system" || item.group === "navigation";
    }

    if (searchScope.mode === "recents") {
      if (!(item.group === "files" && item.entityId && recentScopedFileIds.has(item.entityId))) {
        return false;
      }
    }

    if (searchScope.domain) {
      const itemDepartmentId = typeof item.payload?.departmentId === "string"
        ? item.payload.departmentId
        : "";
      const itemSemesterId = typeof item.payload?.semesterId === "string"
        ? item.payload.semesterId
        : "";

      if (
        itemDepartmentId !== searchScope.domain.departmentId
        || itemSemesterId !== searchScope.domain.semesterId
      ) {
        return false;
      }
    }

    if (searchScope.folder) {
      if (item.group === "files") {
        const parentFolderId = typeof item.payload?.parentFolderId === "string"
          ? item.payload.parentFolderId
          : "";
        const ancestorFolderIds = Array.isArray(item.payload?.ancestorFolderIds)
          ? item.payload.ancestorFolderIds
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
          : [];

        if (
          parentFolderId !== searchScope.folder.folderId
          && !ancestorFolderIds.includes(searchScope.folder.folderId)
        ) {
          return false;
        }
      } else if (item.group === "folders") {
        const ancestorFolderIds = Array.isArray(item.payload?.ancestorFolderIds)
          ? item.payload.ancestorFolderIds
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
          : [];
        if (
          item.entityId !== searchScope.folder.folderId
          && !ancestorFolderIds.includes(searchScope.folder.folderId)
        ) {
          return false;
        }
      } else {
        return false;
      }
    }

    if (searchScope.tag) {
      if (!(item.group === "files" && item.entityId && taggedEntityIds.has(item.entityId))) {
        return false;
      }
    }

    const hasFileScopes = Boolean(searchScope.folder || searchScope.tag || searchScope.domain);
    if (hasFileScopes && item.group !== "files" && item.group !== "folders") {
      return false;
    }

    return true;
  }, [recentScopedFileIds, searchScope, taggedEntityIds]);

  const searchSnapshot = useMemo(() => {
    const startedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const baseResults = commandService.search(debouncedQuery, commandContext);
    const normalizedQuery = debouncedQuery.trim();
    let resultItems = baseResults;

    if (normalizedQuery.length >= FOLDER_QUERY_MIN_LENGTH) {
      const merged = new Map<string, EngineCommandItem>();

      for (const item of fuzzyFolderResults) {
        merged.set(item.id, item);
      }

      for (const item of baseResults) {
        if (item.group === "folders") {
          continue;
        }

        if (!merged.has(item.id)) {
          merged.set(item.id, item);
        }
      }

      resultItems = Array.from(merged.values());
    }

    if (!isScopeEmpty(searchScope)) {
      resultItems = resultItems.filter(matchesScopedFilters);
    }

    resultItems = resultItems.slice(0, resultLimit);
    const endedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    return {
      exactResults: resultItems,
      durationMs: Math.max(0, endedAt - startedAt),
    };
  }, [
    commandContext,
    commandService,
    debouncedQuery,
    fuzzyFolderResults,
    searchScope,
    matchesScopedFilters,
    resultLimit,
  ]);
  const exactResults = searchSnapshot.exactResults;
  const searchDurationMs = searchSnapshot.durationMs;

  const fallbackResults = useMemo(() => {
    const base = commandService.search("", commandContext);
    if (isScopeEmpty(searchScope)) {
      return base.slice(0, resultLimit);
    }

    return base.filter(matchesScopedFilters).slice(0, resultLimit);
  }, [commandContext, commandService, matchesScopedFilters, resultLimit, searchScope]);

  const showingFallbackResults =
    trimmedDeferredQuery.length > 0 && exactResults.length === 0 && semanticHitScores.size === 0;
  const shouldApplyRecencyBias =
    trimmedDeferredQuery.length > 0 && trimmedDeferredQuery.length <= 2;
  const recentCommandRank = useMemo(() => {
    const rank = new Map<string, number>();
    const total = recentCommandIds.length;
    for (let i = 0; i < total; i += 1) {
      rank.set(recentCommandIds[i], total - i);
    }
    return rank;
  }, [recentCommandIds]);

  const results = useMemo(() => {
    const base = showingFallbackResults ? fallbackResults : exactResults;
    if (!shouldApplyRecencyBias || recentCommandRank.size === 0) {
      return base;
    }

    return [...base].sort((left, right) => {
      const leftRecent = recentCommandRank.get(left.id) ?? 0;
      const rightRecent = recentCommandRank.get(right.id) ?? 0;

      const leftScore = (left.score ?? 0) + leftRecent * 6;
      const rightScore = (right.score ?? 0) + rightRecent * 6;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      const titleDiff = left.title.localeCompare(right.title);
      if (titleDiff !== 0) {
        return titleDiff;
      }

      return left.id.localeCompare(right.id);
    });
  }, [
    exactResults,
    fallbackResults,
    recentCommandRank,
    shouldApplyRecencyBias,
    showingFallbackResults,
  ]);
  const semanticCommandById = useMemo(
    () => new Map(semanticCommands.map((item) => [item.id, item])),
    [semanticCommands],
  );
  const semanticReadyForMerge = shouldMergeSemanticResults({
    enabled: intelligenceSmartSearchEnabled,
    runtimeStatus: intelligenceRuntimeStatus,
    query: trimmedDeferredQuery,
    semanticHitCount: semanticHitScores.size,
  });
  const semanticMergedResults = useMemo(() => {
    if (!semanticReadyForMerge) {
      return results;
    }

    const mergedInputs: Array<{
      item: EngineCommandItem;
      keywordScore: number;
      semanticScore: number;
      dedupeKey: string;
      semanticOnly: boolean;
    }> = [];

    const pushMerged = (
      item: EngineCommandItem,
      keywordScore: number,
      semanticScore: number,
      semanticOnly: boolean,
    ) => {
      const dedupeKey = item.entityId ? `entity:${item.entityId}` : `id:${item.id}`;
      mergedInputs.push({
        item,
        keywordScore,
        semanticScore,
        dedupeKey,
        semanticOnly,
      });
    };

    for (const item of results) {
      pushMerged(item, item.score ?? 0, semanticHitScores.get(item.id) ?? 0, false);
    }

    for (const [semanticId, semanticScore] of semanticHitScores.entries()) {
      const item = semanticCommandById.get(semanticId);
      if (!item) {
        continue;
      }

      const existsInKeywordResults = results.some((candidate) => candidate.id === item.id);
      pushMerged(item, existsInKeywordResults ? (item.score ?? 0) : 0, semanticScore, !existsInKeywordResults);
    }

    const merged = mergeSemanticKeywordResults({
      items: mergedInputs,
      semanticWeightPercent: intelligenceSemanticWeight,
      limit: resultLimit,
      sortTieBreaker: (left, right) => {
        const titleDiff = left.title.localeCompare(right.title);
        if (titleDiff !== 0) {
          return titleDiff;
        }

        return left.id.localeCompare(right.id);
      },
    });

    return merged.map((entry) => ({
      ...entry.item,
      score: Math.round(entry.finalScore * 200),
      payload: {
        ...(entry.item.payload ?? {}),
        semanticOnly: entry.semanticOnly,
      },
    }));
  }, [
    intelligenceSemanticWeight,
    resultLimit,
    results,
    semanticCommandById,
    semanticHitScores,
    semanticReadyForMerge,
  ]);

  const displayResults = useMemo(
    () => (scopeSelectorMode ? scopeSelectorItems : semanticMergedResults),
    [scopeSelectorItems, scopeSelectorMode, semanticMergedResults],
  );
  const semanticEnterOrder = useMemo(() => {
    const order = new Map<string, number>();
    let index = 0;

    for (const item of displayResults) {
      if (newlyAppearedSemanticIds.has(item.id)) {
        order.set(item.id, index);
        index += 1;
      }
    }

    return order;
  }, [displayResults, newlyAppearedSemanticIds]);
  const hasAnyScope = useMemo(() => !isScopeEmpty(searchScope), [searchScope]);

  const groupedResults = useMemo(() => {
    const groups = new Map<EngineCommandGroup, EngineCommandItem[]>();

    for (const item of displayResults) {
      const current = groups.get(item.group);
      if (current) {
        current.push(item);
      } else {
        groups.set(item.group, [item]);
      }
    }

    return GROUP_ORDER.map((group) => ({
      group,
      items: groups.get(group) ?? [],
    })).filter((entry) => entry.items.length > 0);
  }, [displayResults]);

  useEffect(() => {
    if (!open || scopeSelectorMode) {
      previousSemanticIdsRef.current = new Set();
      setNewlyAppearedSemanticIds(new Set());
      return;
    }

    const currentSemanticIds = new Set<string>();
    for (const item of displayResults) {
      if (item.payload?.semanticOnly === true) {
        currentSemanticIds.add(item.id);
      }
    }

    const previous = previousSemanticIdsRef.current;
    const entering = new Set<string>();

    for (const id of currentSemanticIds) {
      if (!previous.has(id)) {
        entering.add(id);
      }
    }

    previousSemanticIdsRef.current = currentSemanticIds;
    setNewlyAppearedSemanticIds(entering);

    if (semanticEnterTimerRef.current !== null) {
      window.clearTimeout(semanticEnterTimerRef.current);
      semanticEnterTimerRef.current = null;
    }

    if (entering.size > 0) {
      semanticEnterTimerRef.current = window.setTimeout(() => {
        setNewlyAppearedSemanticIds(new Set());
        semanticEnterTimerRef.current = null;
      }, 900);
    }
  }, [displayResults, open, scopeSelectorMode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    for (const item of displayResults.slice(0, 6)) {
      const route = (item.payload as Record<string, unknown> | undefined)?.route;
      if (typeof route === "string" && route.length > 0) {
        void router.prefetch(route);
      }
    }
  }, [displayResults, open, router]);

  const showSparkleTooltip = useCallback((message: string) => {
    setSparkleTooltipText(message);
    if (sparkleTooltipTimerRef.current !== null) {
      window.clearTimeout(sparkleTooltipTimerRef.current);
    }

    sparkleTooltipTimerRef.current = window.setTimeout(() => {
      setSparkleTooltipText(null);
      sparkleTooltipTimerRef.current = null;
    }, 1500);
  }, []);

  const handleToggleSessionSmartSearch = useCallback(() => {
    vibrate(6);

    setSessionSmartSearchOverride((current) => {
      const effectiveCurrent = current ?? intelligenceSmartSearchSettingEnabled;
      const nextEnabled = !effectiveCurrent;

      if (!nextEnabled) {
        showSparkleTooltip("Smart search off");
      } else if (intelligenceRuntimeStatus === "ready") {
        showSparkleTooltip("Smart search on");
      } else {
        showSparkleTooltip("Warming up…");
      }

      return nextEnabled;
    });
  }, [
    intelligenceRuntimeStatus,
    intelligenceSmartSearchSettingEnabled,
    showSparkleTooltip,
  ]);

  const handleOpenPalette = useCallback(() => {
    vibrate(8);
    setOpen(true);
  }, []);

  const handleClosePalette = useCallback(() => {
    vibrate(6);
    setOpen(false);
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
  }, []);

  const handleQueryChange = useCallback((nextValue: string) => {
    setScopeHistoryCursor(-1);
    const normalized = normalizeStickyPrefixInput(nextValue, stickyPrefixMode);
    const nextStickyMode = normalized.mode;
    if (nextStickyMode) {
      if (nextStickyMode !== stickyPrefixMode) {
        markScopeUsage();
      }
      setStickyPrefixMode(nextStickyMode);
      setScopeSelectorMode(toScopeSelectorMode(nextStickyMode));

      if (nextStickyMode === "actions") {
        if (searchScope.mode !== "actions") {
          applyScope({
            ...searchScope,
            mode: "actions",
          });
        }
      } else if (nextStickyMode === "recents") {
        if (searchScope.mode !== "recents") {
          applyScope({
            ...searchScope,
            mode: "recents",
          });
        }
      } else if (searchScope.mode !== "global") {
        applyScope({
          ...searchScope,
          mode: "global",
        });
      }

      setQuery(normalized.query);
      return;
    }

    setScopeSelectorMode(null);
    if (stickyPrefixMode) {
      setStickyPrefixMode(null);
      if (searchScope.mode !== "global") {
        applyScope({
          ...searchScope,
          mode: "global",
        });
      }
    }

    setQuery(normalized.query);
  }, [applyScope, markScopeUsage, searchScope, stickyPrefixMode]);

  const pushRecentQuery = useCallback((value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    setRecentQueries((current) => {
      const next = [normalized, ...current.filter((entry) => entry !== normalized)]
        .slice(0, MAX_RECENT_QUERIES);
      persistRecentQueries(next);
      return next;
    });
  }, []);

  const pushRecentCommandId = useCallback((value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setRecentCommandIds((current) => {
      const next = [normalized, ...current.filter((entry) => entry !== normalized)]
        .slice(0, MAX_RECENT_COMMANDS);
      persistRecentCommandIds(next);
      return next;
    });
  }, []);

  const executeCommand = useCallback(
    (item: EngineCommandItem) => {
      vibrate(10);
      pushScopeHistory(trimmedDeferredQuery, searchScope);
      pushRecentQuery(trimmedDeferredQuery);
      pushRecentCommandId(item.id);

      const externalUrl = item.payload?.url;
      const isOfflinePreferred = item.payload?.offlineOnly === true;
      const isOfflineFile =
        item.group === "files"
        && !!item.entityId
        && (isOfflinePreferred || !!offlineFiles[item.entityId]);
      if (isOfflineFile && item.entityId) {
        void openLocalFirst(
          item.entityId,
          typeof externalUrl === "string" && externalUrl
            ? externalUrl
            : `/api/file/${encodeURIComponent(item.entityId)}/stream`,
        );
        setOpen(false);
        return;
      }

      if (typeof externalUrl === "string" && externalUrl) {
        window.open(externalUrl, "_blank", "noopener,noreferrer");
        setOpen(false);
        return;
      }

      const route = item.payload?.route;
      if (typeof route === "string") {
        if (isOfflineLibraryRoute(route) && typeof navigator !== "undefined" && navigator.onLine === false) {
          navigateToOfflineLibrary(undefined, route);
          setOpen(false);
          return;
        }

        const nextRoute = isOfflineLibraryRoute(route)
          ? resolveOfflineLibraryRoute(route)
          : route;
        router.push(nextRoute);
        setOpen(false);
        return;
      }

      dispatcher.execute(item);
      setOpen(false);
    },
    [
      dispatcher,
      offlineFiles,
      pushRecentCommandId,
      pushRecentQuery,
      pushScopeHistory,
      router,
      searchScope,
      trimmedDeferredQuery,
    ],
  );

  const handleScopeSelectorChoose = useCallback((item: EngineCommandItem): boolean => {
    if (!scopeSelectorMode) {
      return false;
    }

    const scopeKind = typeof item.payload?.scopeKind === "string" ? item.payload.scopeKind : "";
    if (scopeKind === "folder") {
      const folderId = typeof item.payload?.folderId === "string" ? item.payload.folderId : "";
      const label = typeof item.payload?.label === "string" ? item.payload.label : "Folder";
      if (!folderId) {
        return true;
      }
      applyScope({
        ...searchScope,
        folder: { folderId, label },
      });
      setScopeSelectorMode(null);
      setStickyPrefixMode(null);
      setQuery("");
      return true;
    }

    if (scopeKind === "tag") {
      const tagId = typeof item.payload?.tagId === "string" ? item.payload.tagId : "";
      const label = typeof item.payload?.label === "string" ? item.payload.label : "Tag";
      if (!tagId) {
        return true;
      }
      applyScope({
        ...searchScope,
        tag: { tagId, label },
      });
      setScopeSelectorMode(null);
      setStickyPrefixMode(null);
      setQuery("");
      return true;
    }

    if (scopeKind === "domain") {
      const departmentIdValue =
        typeof item.payload?.departmentId === "string" ? item.payload.departmentId : "";
      const semesterIdValue =
        typeof item.payload?.semesterId === "string" ? item.payload.semesterId : "";
      const label = typeof item.payload?.label === "string" ? item.payload.label : "Department";
      if (!departmentIdValue || !semesterIdValue) {
        return true;
      }

      applyScope({
        ...searchScope,
        domain: {
          departmentId: departmentIdValue,
          semesterId: semesterIdValue,
          label,
        },
      });
      setScopeSelectorMode(null);
      setStickyPrefixMode(null);
      setQuery("");
      return true;
    }

    return true;
  }, [applyScope, scopeSelectorMode, searchScope]);

  const handleItemSelect = useCallback((item: EngineCommandItem) => {
    if (handleScopeSelectorChoose(item)) {
      return;
    }

    executeCommand(item);
  }, [executeCommand, handleScopeSelectorChoose]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
    setRecentQueries(loadRecentQueries());
    setRecentCommandIds(loadRecentCommandIds());
    setSearchScope(loadPersistedScope());
    setScopeHistory(loadScopeHistory());
    setIsScopeHintSeen(hasSeenScopeHint());
  }, []);

  useEffect(() => {
    if (!open || isTagHydrated) {
      return;
    }

    void hydrateTags().catch(() => undefined);
  }, [hydrateTags, isTagHydrated, open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isToggle =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isToggle) {
        event.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            vibrate(8);
          }
          return !prev;
        });
      }

      const isReenterScope =
        event.ctrlKey
        && event.shiftKey
        && (event.code === "Slash" || event.key === "?");
      if (isReenterScope) {
        const lastScopedEntry = scopeHistory.find((entry) => !isScopeEmpty(entry.scope));
        if (lastScopedEntry) {
          event.preventDefault();
          if (!open) {
            setOpen(true);
          }
          applyScope(lastScopedEntry.scope);
          setScopeSelectorMode(null);
          setStickyPrefixMode(null);
          return;
        }
      }

      if (open && event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === "1") {
          event.preventDefault();
          activatePrefixMode("folders");
          return;
        }
        if (event.key === "2") {
          event.preventDefault();
          activatePrefixMode("tags");
          return;
        }
        if (event.key === "3") {
          event.preventDefault();
          activatePrefixMode("actions");
          return;
        }
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        if (scopeSelectorMode) {
          vibrate(6);
          setScopeSelectorMode(null);
          setStickyPrefixMode(null);
          setQuery("");
          setScopeHistoryCursor(-1);
          return;
        }

        if (query.trim().length > 0) {
          vibrate(6);
          setQuery("");
          setScopeHistoryCursor(-1);
          return;
        }

        if (stickyPrefixMode) {
          vibrate(6);
          clearStickyPrefixMode();
          setScopeHistoryCursor(-1);
          return;
        }

        if (!isScopeEmpty(searchScope)) {
          vibrate(6);
          applyScope(GLOBAL_SCOPE);
          return;
        }

        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activatePrefixMode,
    applyScope,
    clearStickyPrefixMode,
    open,
    query,
    scopeHistory,
    scopeSelectorMode,
    searchScope,
    stickyPrefixMode,
  ]);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    const updateViewportMetrics = () => {
      const viewport = window.visualViewport;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      const height = viewport?.height ?? windowHeight;
      const width = viewport?.width ?? windowWidth;
      const offsetTop = viewport?.offsetTop ?? 0;
      const keyboardInset = Math.max(0, windowHeight - height - offsetTop);

      setViewportMetrics({
        height,
        width,
        offsetTop,
        keyboardInset,
      });
    };

    updateViewportMetrics();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", updateViewportMetrics);
    viewport?.addEventListener("scroll", updateViewportMetrics);
    window.addEventListener("resize", updateViewportMetrics);

    return () => {
      viewport?.removeEventListener("resize", updateViewportMetrics);
      viewport?.removeEventListener("scroll", updateViewportMetrics);
      window.removeEventListener("resize", updateViewportMetrics);
    };
  }, [open]);

  // Reset active index when visible items change
  useEffect(() => {
    setActiveIndex(0);
  }, [displayResults]);

  // Scroll active item into view on keyboard navigation
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    queueMicrotask(() => {
      setOpen(false);
      setQuery("");
      setScopeSelectorMode(null);
      setStickyPrefixMode(null);
      setScopeHistoryCursor(-1);
      setActiveIndex(0);
    });
  }, [pathname]);

  const showLoadingSkeleton =
    !scopeSelectorMode
    &&
    !trimmedDeferredQuery
    && (
      isCatalogLoading
      || (isFolderScope && isDriveLoading)
      || (isNestedIndexing && nestedFileEntries.length === 0)
      || (intelligenceSmartSearchEnabled && intelligenceRuntimeStatus === "loading")
    );
  const smartSearchStatusText = intelligenceSmartSearchEnabled
    ? intelligenceRuntimeStatus === "loading"
      ? "Warming up"
      : intelligenceRuntimeStatus === "ready"
        ? semanticQueryPending
          ? "Searching"
          : semanticQueryTimedOut
            ? "Partial results"
            : semanticQueryError
              ? "Keyword fallback"
              : intelligenceIndexing
                ? "Learning your files"
                : "Smart search active"
        : intelligenceRuntimeStatus === "error"
          ? "Unavailable"
        : ""
    : "";
  const showModelSetupProgress =
    open
    && intelligenceSmartSearchEnabled
    && intelligenceRuntimeStatus === "loading";
  const indexingTotal = indexingProgress?.total ?? semanticDocuments.length;
  const indexingProcessed = indexingProgress
    ? Math.min(indexingProgress.processed, indexingTotal)
    : Math.min(intelligenceIndexedDocs, indexingTotal);
  const indexingPercent = indexingTotal > 0
    ? Math.max(0, Math.min(100, (indexingProcessed / indexingTotal) * 100))
    : 0;
  const showIndexingProgress =
    open
    && intelligenceSmartSearchEnabled
    && intelligenceRuntimeStatus === "ready"
    && intelligenceIndexing
    && indexingTotal > 0;
  const showInlineProgress = showModelSetupProgress || showIndexingProgress;
  const showExperimentalNoticeLine =
    hasActivatedSmartSearchSession
    && intelligenceSmartSearchEnabled
    && showExperimentalNotice;
  const isMobilePalette = isCoarsePointer || (viewportMetrics.width > 0 && viewportMetrics.width <= 820);
  const panelHeight = Math.min(
    isMobilePalette ? 920 : 880,
    Math.max(isMobilePalette ? 420 : 360, (viewportMetrics.height || 760) - (isMobilePalette ? 8 : 24)),
  );
  const overlayTopInset = isMobilePalette
    ? Math.max(0, viewportMetrics.offsetTop)
    : Math.max(12, viewportMetrics.offsetTop + 12);
  const overlayBottomInset = isMobilePalette
    ? Math.max(0, viewportMetrics.keyboardInset)
    : Math.max(12, viewportMetrics.keyboardInset + 12);
  const listBottomInset = Math.max(isMobilePalette ? 14 : 18, viewportMetrics.keyboardInset + (isMobilePalette ? 16 : 12));
  const inputCenterOffset = useMemo(() => {
    if (
      !isCoarsePointer
      || effectiveVisualQuery.length === 0
      || viewportMetrics.keyboardInset <= 0
    ) {
      return 0;
    }

    const viewportWidth = viewportMetrics.width || 390;
    const keyboardInset = viewportMetrics.keyboardInset;
    const base = Math.max(0, panelHeight - 420);

    let minOffset = 18;
    let maxOffset = 72;
    let ratio = 0.25;

    if (viewportWidth >= 520 && viewportWidth < 900) {
      minOffset = 26;
      maxOffset = 102;
      ratio = 0.34;
    } else if (viewportWidth >= 900) {
      minOffset = 34;
      maxOffset = 124;
      ratio = 0.38;
    }

    const keyboardCompensation = keyboardInset > 0 ? keyboardInset * 0.18 : 0;
    const rawOffset = base * ratio - keyboardCompensation;
    return Math.max(minOffset, Math.min(maxOffset, rawOffset));
  }, [
    effectiveVisualQuery.length,
    isCoarsePointer,
    panelHeight,
    viewportMetrics.keyboardInset,
    viewportMetrics.width,
  ]);

  const scopePills = useMemo(() => {
    const pills: Array<{
      key: string;
      label: string;
      icon: "folder" | "tag" | "domain" | "mode";
      onRemove: () => void;
    }> = [];

    if (searchScope.domain) {
      pills.push({
        key: `domain-${searchScope.domain.departmentId}-${searchScope.domain.semesterId}`,
        label: searchScope.domain.label,
        icon: "domain",
        onRemove: () => applyScope({ ...searchScope, domain: null }),
      });
    }

    if (searchScope.folder) {
      pills.push({
        key: `folder-${searchScope.folder.folderId}`,
        label: searchScope.folder.label,
        icon: "folder",
        onRemove: () => applyScope({ ...searchScope, folder: null }),
      });
    }

    if (searchScope.tag) {
      pills.push({
        key: `tag-${searchScope.tag.tagId}`,
        label: `#${searchScope.tag.label}`,
        icon: "tag",
        onRemove: () => applyScope({ ...searchScope, tag: null }),
      });
    }

    if (searchScope.mode !== "global") {
      pills.push({
        key: `mode-${searchScope.mode}`,
        label: searchScope.mode === "actions" ? "Actions" : "Recents",
        icon: "mode",
        onRemove: () => applyScope({ ...searchScope, mode: "global" }),
      });
    }

    return pills;
  }, [applyScope, searchScope]);
  const stickyModeDescriptor = useMemo(
    () => resolvePrefixModeDescriptor(stickyPrefixMode),
    [stickyPrefixMode],
  );
  const commandInputPlaceholder = useMemo(() => {
    if (stickyPrefixMode === "folders") {
      return "Choose a folder scope...";
    }
    if (stickyPrefixMode === "tags") {
      return "Choose a tag scope...";
    }
    if (stickyPrefixMode === "domains") {
      return "Choose a department/semester scope...";
    }
    if (stickyPrefixMode === "actions") {
      return "Search actions...";
    }
    if (stickyPrefixMode === "recents") {
      return "Search recent items...";
    }
    return scopePills.length > 0 ? "Search in current scope..." : placeholder;
  }, [placeholder, scopePills.length, stickyPrefixMode]);

  const activeScopeLabel = useMemo(() => {
    if (scopePills.length === 0) {
      return "Global";
    }
    return scopePills.map((pill) => pill.label).join(" + ");
  }, [scopePills]);
  const footerScopeLabel = stickyModeDescriptor
    ? `${stickyModeDescriptor.label} (${stickyModeDescriptor.prefix})`
    : activeScopeLabel;

  const showEssentialScopeBar = shouldShowEssentialScopeBar(query);
  const essentialScopeUiState = useMemo(
    () => ({
      prefixMode: stickyPrefixMode,
      scopeSelectorMode,
      searchMode: searchScope.mode,
    }),
    [scopeSelectorMode, searchScope.mode, stickyPrefixMode],
  );

  useEffect(() => {
    if (scopePills.length === 0) {
      writeScopeSummary("");
      return;
    }

    writeScopeSummary(activeScopeLabel);
  }, [activeScopeLabel, scopePills.length]);

  useEffect(() => {
    const cmd = searchParams.get(CMD_QUERY_PARAM);
    if (cmd !== "open") {
      return;
    }

    const serializedScope = searchParams.get(CMD_SCOPE_PARAM);
    const queryFromUrl = searchParams.get(CMD_TEXT_PARAM) ?? "";
    const key = `${cmd}|${serializedScope ?? ""}|${queryFromUrl}`;
    if (urlApplyRef.current === key) {
      return;
    }
    urlApplyRef.current = key;

    const parsedScope = parseScopeFromSerialized(serializedScope);
    if (parsedScope.folder) {
      const folderOption = folderScopeOptions.find((option) => option.folderId === parsedScope.folder?.folderId);
      if (folderOption) {
        parsedScope.folder = { folderId: folderOption.folderId, label: folderOption.label };
      }
    }
    if (parsedScope.tag) {
      const tagOption = tags.find((tag) => tag.id === parsedScope.tag?.tagId);
      if (tagOption) {
        parsedScope.tag = { tagId: tagOption.id, label: tagOption.name };
      }
    }
    if (parsedScope.domain) {
      parsedScope.domain = {
        ...parsedScope.domain,
        label: `${getDepartmentName(parsedScope.domain.departmentId)} · Semester ${parsedScope.domain.semesterId}`,
      };
    }

    applyScope(parsedScope);
    setQuery(queryFromUrl);
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
    setOpen(true);
  }, [applyScope, folderScopeOptions, searchParams, tags]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (open) {
      nextParams.set(CMD_QUERY_PARAM, "open");
      nextParams.set(CMD_TEXT_PARAM, query);
      const serialized = serializeScope(searchScope);
      if (serialized) {
        nextParams.set(CMD_SCOPE_PARAM, serialized);
      } else {
        nextParams.delete(CMD_SCOPE_PARAM);
      }
    } else {
      nextParams.delete(CMD_QUERY_PARAM);
      nextParams.delete(CMD_SCOPE_PARAM);
      nextParams.delete(CMD_TEXT_PARAM);
    }

    const qs = nextParams.toString();
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    if (urlSyncRef.current === nextUrl) {
      return;
    }
    urlSyncRef.current = nextUrl;
    router.replace(nextUrl, { scroll: false });
  }, [open, pathname, query, router, searchParams, searchScope]);

  return (
    <>
      <FloatingDock 
        isPaletteOpen={open}
        onOpenPalette={handleOpenPalette}
        placeholder={placeholder}
      />

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.durations.normal }}
            className={cn(
              "fixed inset-0 z-50 flex bg-background/88 backdrop-blur-md",
              isMobilePalette ? "items-end justify-stretch" : "items-center justify-center",
            )}
            style={{
              paddingTop: overlayTopInset,
              paddingBottom: overlayBottomInset,
              paddingLeft: isMobilePalette ? 0 : 12,
              paddingRight: isMobilePalette ? 0 : 12,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: isMobilePalette ? 28 : 20, scale: isMobilePalette ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isMobilePalette ? 20 : 12, scale: isMobilePalette ? 1 : 0.99 }}
              transition={{ type: "spring", ...motionTokens.spring }}
              className={cn(
                "mx-auto flex w-full min-h-0 flex-col border border-border/80 bg-card/95 p-2 shadow-2xl",
                isMobilePalette
                  ? "max-w-none rounded-t-2xl rounded-b-none border-b-0 px-2 pb-2"
                  : "max-w-3xl rounded-2xl",
              )}
              style={{ height: panelHeight }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <SmartSearchIndicator
                    enabled={intelligenceSmartSearchEnabled}
                    status={intelligenceRuntimeStatus}
                    indexing={intelligenceIndexing}
                  />
                  <IconSparkles className="size-3.5" />
                  <span>
                    {showLoadingSkeleton
                      ? "Indexing context..."
                      : scopeSelectorMode
                        ? `${displayResults.length} ${
                          scopeSelectorMode === "folders"
                            ? "folder"
                            : scopeSelectorMode === "tags"
                            ? "tag"
                              : "scope"
                        } option${displayResults.length === 1 ? "" : "s"}`
                        : `${displayResults.length} result${displayResults.length === 1 ? "" : "s"} · ${searchDurationMs < 10 ? searchDurationMs.toFixed(2) : searchDurationMs.toFixed(1)} ms${shouldApplyRecencyBias ? " · recency boost" : ""}${isNestedIndexing ? " · refreshing nested index" : ""}${intelligenceSmartSearchEnabled ? ` · ${smartSearchStatusText}` : ""}`}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="size-9 rounded-md"
                  onClick={handleClosePalette}
                >
                  <IconX className="size-4" />
                  <span className="sr-only">Close command palette</span>
                </Button>
              </div>

              <Command
                shouldFilter={false}
                className="flex min-h-0 flex-1 rounded-xl border border-border/80 bg-card p-1 shadow-inner"
                onKeyDown={(e) => {
                  const flatItems = displayResults;
                  const totalItems = flatItems.length;

                  if (e.key === "Backspace" && query.trim().length === 0) {
                    if (scopeSelectorMode) {
                      e.preventDefault();
                      setScopeSelectorMode(null);
                      if (stickyPrefixMode && toScopeSelectorMode(stickyPrefixMode) === scopeSelectorMode) {
                        setStickyPrefixMode(null);
                      }
                      setScopeHistoryCursor(-1);
                      return;
                    }

                    if (stickyPrefixMode) {
                      e.preventDefault();
                      clearStickyPrefixMode();
                      setScopeHistoryCursor(-1);
                      return;
                    }

                    if (!isScopeEmpty(searchScope)) {
                      e.preventDefault();
                      removeLastScopePill();
                      return;
                    }
                  }

                  if (e.key === "ArrowUp" && query.trim().length === 0 && scopeSelectorMode === null && activeIndex === 0 && scopeHistory.length > 0) {
                    e.preventDefault();
                    const nextCursor = Math.min(scopeHistoryCursor + 1, scopeHistory.length - 1);
                    const entry = scopeHistory[nextCursor];
                    if (entry) {
                      setScopeHistoryCursor(nextCursor);
                      applyScope(entry.scope);
                      setQuery(entry.query);
                      setScopeSelectorMode(null);
                    }
                    return;
                  }

                  // Ctrl+N / Ctrl+P vim-style navigation
                  if (totalItems === 0) return;
                  if (e.ctrlKey && e.key === "n") {
                    e.preventDefault();
                    setActiveIndex((prev) => Math.min(prev + 1, totalItems - 1));
                    return;
                  }
                  if (e.ctrlKey && e.key === "p") {
                    e.preventDefault();
                    setActiveIndex((prev) => Math.max(prev - 1, 0));
                    return;
                  }

                  // Alt+↓ / Alt+↑ to jump between groups
                  if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                    e.preventDefault();
                    let currentGroupStart = 0;
                    const groupStarts: number[] = [];
                    for (const group of groupedResults) {
                      groupStarts.push(currentGroupStart);
                      currentGroupStart += group.items.length;
                    }
                    const currentGroupIndex = groupStarts.findIndex((start, i) => {
                      const end = i < groupStarts.length - 1 ? groupStarts[i + 1] : totalItems;
                      return activeIndex >= start && activeIndex < end;
                    });

                    if (e.key === "ArrowDown" && currentGroupIndex < groupStarts.length - 1) {
                      setActiveIndex(groupStarts[currentGroupIndex + 1]);
                    } else if (e.key === "ArrowUp" && currentGroupIndex > 0) {
                      setActiveIndex(groupStarts[currentGroupIndex - 1]);
                    }
                    return;
                  }

                  // Standard arrow navigation
                  if (e.key === "ArrowDown") {
                    if (scopeHistoryCursor >= 0) {
                      setScopeHistoryCursor(-1);
                    }
                    e.preventDefault();
                    setActiveIndex((prev) => Math.min(prev + 1, totalItems - 1));
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((prev) => Math.max(prev - 1, 0));
                    return;
                  }

                  // Enter to execute
                  if (e.key === "Enter" && activeIndex >= 0 && activeIndex < totalItems) {
                    e.preventDefault();
                    handleItemSelect(flatItems[activeIndex]);
                  }
                }}
              >
                <motion.div
                  initial={false}
                  animate={{
                    scale: effectiveVisualQuery ? 1.02 : 1,
                    marginTop: inputCenterOffset,
                  }}
                  transition={{ type: "spring", ...motionTokens.spring }}
                  className="relative mx-auto w-full max-w-2xl"
                >
                  {scopePills.length > 0 || stickyModeDescriptor ? (
                    <div className="px-1 pb-1.5">
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {stickyModeDescriptor ? (() => {
                          const StickyIcon = stickyModeDescriptor.icon;
                          return (
                            <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[11px] font-medium text-primary">
                              <StickyIcon className="size-3.5 shrink-0" />
                              <span>{stickyModeDescriptor.label}</span>
                              <span className="rounded border border-primary/25 bg-primary/10 px-1 py-px text-[9px]">
                                {stickyModeDescriptor.prefix}
                              </span>
                            </div>
                          );
                        })() : null}
                        <AnimatePresence mode="popLayout">
                          {scopePills.map((pill) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, scale: 0.8, x: -10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.8, x: -10 }}
                              transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
                              key={pill.key}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary shadow-xs transition-colors hover:bg-primary/15 hover:border-primary/40"
                            >
                              {pill.icon === "folder" ? (
                                <IconFolder className="size-3.5 shrink-0" />
                              ) : pill.icon === "tag" ? (
                                <IconTag className="size-3.5 shrink-0" />
                              ) : pill.icon === "domain" ? (
                                <IconDatabase className="size-3.5 shrink-0" />
                              ) : pill.label === "Actions" ? (
                                <IconBolt className="size-3.5 shrink-0" />
                              ) : (
                                <IconClockHour4 className="size-3.5 shrink-0" />
                              )}
                              <span className="max-w-24 truncate">{pill.label}</span>
                              <button
                                type="button"
                                className="shrink-0 rounded-full p-0.5 opacity-60 transition-all hover:bg-primary/20 hover:text-primary hover:opacity-100"
                                onClick={pill.onRemove}
                                aria-label={`Remove ${pill.label} scope`}
                              >
                                <IconX className="size-3.5 shrink-0" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : null}
                  <CommandInput
                    value={query}
                    onValueChange={handleQueryChange}
                    placeholder={commandInputPlaceholder}
                    autoFocus
                    className={cn(
                      "pr-1",
                    )}
                    endAction={(
                      <div className="relative flex items-center gap-1">
                        <motion.button
                          type="button"
                          aria-label="Toggle smart search"
                          aria-pressed={intelligenceSmartSearchEnabled}
                          onClick={handleToggleSessionSmartSearch}
                          className={cn(
                            "inline-flex size-7 items-center justify-center rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                            intelligenceSmartSearchEnabled
                              ? "text-primary"
                              : "text-muted-foreground opacity-70",
                          )}
                          animate={intelligenceSmartSearchEnabled
                            ? { scale: [1, 1.12, 1] }
                            : { scale: 1 }}
                          transition={intelligenceSmartSearchEnabled
                            ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                            : { duration: 0.2, ease: "easeOut" }}
                        >
                          <Sparkles className="size-3.5" />
                        </motion.button>

                        {effectiveVisualQuery ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-7 rounded-md"
                            onClick={() => {
                              vibrate(6);
                              setQuery("");
                              setScopeHistoryCursor(-1);
                            }}
                          >
                            <IconX className="size-3.5" />
                            <span className="sr-only">Clear query</span>
                          </Button>
                        ) : null}

                        <AnimatePresence>
                          {sparkleTooltipText ? (
                            <motion.span
                              initial={{ opacity: 0, y: -2 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -2 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="pointer-events-none absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-md border border-border/70 bg-card px-2 py-1 text-[10px] text-muted-foreground shadow-sm"
                            >
                              {sparkleTooltipText}
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    )}
                  />
                </motion.div>

                <AnimatePresence initial={false}>
                  {showExperimentalNoticeLine ? (
                    <motion.div
                      key="experimental-notice"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden px-2 pb-1"
                    >
                      <div className="flex items-center gap-2 overflow-hidden rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-medium text-foreground/80 shadow-xs transition-colors hover:bg-primary/10 hover:text-foreground">
                        <span className="truncate">{"\u2697\ufe0f"} Smart Search is experimental</span>
                        <span aria-hidden="true" className="text-muted-foreground/60">·</span>
                        <Link
                          href="/blog/how-semantic-search-works"
                          className="shrink-0 text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
                        >
                          Learn more
                        </Link>
                        <span aria-hidden="true" className="text-muted-foreground/60">·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowExperimentalNotice(false);
                            try { window.localStorage.setItem("studytrix.smartsearch.noticeDismissed", "1"); } catch { /* ignore */ }
                          }}
                          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10"
                          aria-label="Dismiss smart search notice"
                        >
                          <IconX className="size-3" />
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence initial={false} mode="wait">
                  {showInlineProgress ? (
                    <motion.div
                      key={showIndexingProgress ? "indexing-progress" : "download-progress"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="px-2 pb-1 pt-1"
                    >
                      <div className="mb-1 text-[11px] text-muted-foreground">
                        {showIndexingProgress
                          ? `Indexing your library \u2014 ${indexingProcessed} of ${indexingTotal} files`
                          : modelDownloadProgress
                            ? `Setting up smart search \u2014 ${modelDownloadProgress.remainingMb.toFixed(1)}MB of ${modelDownloadProgress.totalMb.toFixed(1)}MB remaining`
                            : "Setting up smart search \u2014 downloading once (~34MB)"}
                      </div>
                      <div className="relative h-1 w-full overflow-hidden rounded-full bg-primary/15">
                        {showIndexingProgress ? (
                          <motion.div
                            className="h-full rounded-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${indexingPercent}%` }}
                            transition={{ type: "spring", stiffness: 220, damping: 26, mass: 0.7 }}
                          />
                        ) : (
                          <motion.div
                            className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-primary/15 via-primary to-primary/15"
                            animate={{ x: ["-140%", "240%"] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                          />
                        )}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {showEssentialScopeBar ? (
                  <div className="px-2 pb-1 pt-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      {ESSENTIAL_SCOPE_ACTIONS.map((action) => {
                        const ScopeIcon = action.icon;
                        const isActive = isEssentialActionActive(action.key, essentialScopeUiState);
                        return (
                          <Button
                            key={action.key}
                            type="button"
                            variant={isActive ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                              vibrate(6);
                              const transition = resolveEssentialScopeTransition(action.key);
                              if (transition.clearScope) {
                                handleClearSearchAndScope();
                                return;
                              }

                              if (transition.prefixMode) {
                                activatePrefixMode(transition.prefixMode);
                              }
                            }}
                            className={cn(
                              "h-7 shrink-0 rounded-md px-2 text-[11px]",
                              isActive ? "border-primary/30 bg-primary/12 text-primary" : "border-border/80",
                            )}
                          >
                            <ScopeIcon className="size-3.5" />
                            {action.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <motion.div
                  layout
                  initial={false}
                  animate={{ opacity: 1, y: showInlineProgress ? 2 : 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
                  className="flex min-h-0 flex-1"
                >
                  <CommandList
                    ref={listRef}
                    className="min-h-0 max-h-none flex-1 rounded-lg border border-transparent p-1"
                    style={{ paddingBottom: listBottomInset }}
                  >
                    {showLoadingSkeleton ? (
                      <div className="space-y-2 px-1 py-2">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <div key={`command-skeleton-${index}`} className="space-y-1.5 rounded-lg border border-border/60 p-2 border-border/70">
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-2.5 w-2/3" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {showingFallbackResults && !scopeSelectorMode ? (
                          <div className="mx-1 mb-2 rounded-lg border border-border/70 bg-muted/70 px-3 py-2 text-[11px] text-muted-foreground">
                            No exact matches. Showing top commands instead.
                          </div>
                        ) : null}
                        <CommandEmpty>
                          <div className="flex flex-col items-center gap-2 py-6 text-center">
                            <IconSearch className="size-4 text-muted-foreground/80" />
                            <p className="text-xs font-medium text-muted-foreground">
                              {scopeSelectorMode
                                ? `No ${scopeSelectorMode === "folders" ? "folders" : scopeSelectorMode === "tags" ? "tags" : "scope options"} for "${effectiveVisualQuery || "..."}"`
                                : hasAnyScope
                                  ? `No files in ${activeScopeLabel} match "${effectiveVisualQuery || "..."}"`
                                  : `No results for "${effectiveVisualQuery || "..."}"`}
                            </p>
                            {!scopeSelectorMode ? (
                              <p className="text-[11px] text-muted-foreground">
                                Try: <span className="font-medium">settings</span>, <span className="font-medium">storage</span>, <span className="font-medium">tag</span>
                              </p>
                            ) : null}
                            {!scopeSelectorMode && hasAnyScope ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-full text-[11px]"
                                onClick={() => applyScope(GLOBAL_SCOPE)}
                              >
                                Expand to global search
                              </Button>
                            ) : null}
                          </div>
                        </CommandEmpty>

                        {groupedResults.map((group) => {
                        const meta = scopeSelectorMode
                          ? (() => {
                            if (scopeSelectorMode === "folders") {
                              return {
                                label: "Folder Scope",
                                icon: IconFolder,
                                tone: "bg-primary/12",
                                iconTone: "text-primary",
                              };
                            }
                            if (scopeSelectorMode === "tags") {
                              return {
                                label: "Tag Scope",
                                icon: IconTag,
                                tone: "bg-primary/12",
                                iconTone: "text-primary",
                              };
                            }
                            return {
                              label: "Domain Scope",
                              icon: IconDatabase,
                              tone: "bg-primary/12",
                              iconTone: "text-primary",
                            };
                          })()
                          : GROUP_META[group.group];
                        const GroupIcon = meta.icon;

                        return (
                          <CommandGroup key={group.group}>
                            <div className="mb-1 flex items-center justify-between px-2.5 pt-1 text-[11px] font-medium text-muted-foreground">
                              <div className="inline-flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "inline-flex size-5 items-center justify-center rounded-md",
                                    meta.tone,
                                  )}
                                >
                                  <GroupIcon className={cn("size-3.5", meta.iconTone)} />
                                </span>
                                <span>{meta.label}</span>
                              </div>
                              <span>{group.items.length}</span>
                            </div>
                            <motion.div
                              variants={staggerContainer}
                              initial={false}
                              animate="visible"
                            >
                            {group.items.map((item) => {
                              const ItemIcon = getCommandIcon(item);
                              const itemIconTone = getCommandIconTone(item);
                              const isSemanticOnly = item.payload?.semanticOnly === true;
                              const isOfflineFile =
                                item.group === "files"
                                && Boolean(item.entityId)
                                && (item.payload?.offlineOnly === true || Boolean(item.entityId && offlineFiles[item.entityId]));
                              const contentBadge = getContentBadge(item);
                              const flatIndex = displayResults.findIndex((candidate) => candidate.id === item.id);
                              const isActive = flatIndex === activeIndex;
                              const semanticEntryOrder = semanticEnterOrder.get(item.id) ?? -1;
                              const shouldAnimateSemanticEntry =
                                isSemanticOnly
                                && semanticEntryOrder >= 0
                                && motionTokens.scale > 0;

                              return (
                                <motion.div
                                  key={item.id}
                                  initial={shouldAnimateSemanticEntry ? { opacity: 0, y: 4 } : false}
                                  animate={{ opacity: 1, x: 0, y: 0 }}
                                  transition={shouldAnimateSemanticEntry
                                    ? {
                                      duration: 0.15,
                                      ease: "easeOut",
                                      delay: semanticEntryOrder * 0.04,
                                    }
                                    : { duration: 0.12, ease: "easeOut" }}
                                  ref={isActive ? activeItemRef : undefined}
                                >
                                <CommandItem
                                  value={item.id}
                                  className={cn(
                                    isMobilePalette ? "min-h-[54px]" : "min-h-12",
                                    "rounded-lg border-l-[3px] transition-all duration-150",
                                    isSemanticOnly ? "border-l-primary/60" : "border-l-transparent",
                                    isActive
                                      ? "bg-primary/10 ring-1 ring-ring/40"
                                      : "data-[selected=true]:translate-x-0.5",
                                  )}
                                  onSelect={() => handleItemSelect(item)}
                                  onMouseEnter={() => setActiveIndex(flatIndex)}
                                  data-active={isActive}
                                >
                                  <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted border-border bg-muted">
                                    <ItemIcon className={cn("size-4", itemIconTone)} />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">
                                      <HighlightedText
                                        text={item.title}
                                        query={effectiveVisualQuery}
                                      />
                                    </div>
                                    {item.subtitle ? (
                                      <div className="truncate text-[11px] text-muted-foreground">
                                        <HighlightedText
                                          text={item.subtitle}
                                          query={effectiveVisualQuery}
                                        />
                                      </div>
                                    ) : null}
                                  </div>

                                  {isOfflineFile ? (
                                    <span className="rounded-full border border-primary/35 bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                      Offline
                                    </span>
                                  ) : null}

                                  {contentBadge ? (
                                    <span className="shrink-0 rounded-full border border-border/80 bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border-border/80 bg-muted text-muted-foreground">
                                      {contentBadge}
                                    </span>
                                  ) : null}

                                  {debugCommandScoring && typeof item.score === "number" ? (
                                    <span className="shrink-0 rounded-full border border-primary/25 bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                      Score {Math.round(item.score)}
                                    </span>
                                  ) : null}
                                </CommandItem>
                                </motion.div>
                              );
                            })}
                            </motion.div>
                          </CommandGroup>
                        );
                        })}
                      </>
                    )}
                  </CommandList>
                </motion.div>
                <div className="mt-1 flex items-center justify-between rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="rounded border border-border/80 px-1 py-px text-[9px] border-border">
                      {footerScopeLabel}
                    </span>
                    {showLoadingSkeleton
                      ? "Preparing context index..."
                      : `${displayResults.length} result${displayResults.length === 1 ? "" : "s"}${intelligenceSmartSearchEnabled ? ` · ${smartSearchStatusText}` : ""}`}
                  </span>
                  <span className="hidden sm:inline">↑↓ Navigate · Enter Open · Esc Layered Cancel · Alt+1 Folder · Alt+2 Tag · Alt+3 Actions</span>
                  <span className="sm:hidden">↑↓ · Enter · Esc</span>
                </div>
              </Command>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
