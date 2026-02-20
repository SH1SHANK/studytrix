"use client";

import {
  type ComponentType,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  IconDownload,
  IconFile,
  IconFolder,
  IconHome,
  IconSearch,
  IconSettings,
  IconSparkles,
  IconTag,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion, type Easing } from "framer-motion";

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
  CommandShortcut,
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
import { useTagStore } from "@/features/tags/tag.store";
import { useDownloadStore } from "@/features/download/download.store";
import {
  loadOfflineLibrarySnapshot,
  type OfflineLibrarySnapshot,
} from "@/features/offline/offline.library";
import { buildNestedRootSignature } from "@/features/offline/offline.query-cache.keys";

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

const staggerItem = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: "easeOut" as Easing } },
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

const QUICK_QUERIES: ReadonlyArray<{
  label: string;
  query: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { label: "Tags", query: "tag", icon: IconTag },
  { label: "Settings", query: "settings", icon: IconSettings },
  { label: "Storage", query: "storage", icon: IconDatabase },
  { label: "Offline", query: "offline", icon: IconCloudOff },
];

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
    const parentFolderId = parseString(record.parentFolderId);
    const parentFolderName = parseString(record.parentFolderName);

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
      parentFolderId,
      parentFolderName: parentFolderName ?? courseName ?? courseCode,
      path: parseString(record.path) ?? (courseName ?? courseCode),
    });
  }

  return entries;
}

function getCommandIcon(item: EngineCommandItem): ComponentType<{ className?: string }> {
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

function getScopeLabel(scope: SearchScope): string {
  if (scope.folder) {
    return scope.folder.label;
  }

  if (scope.tag) {
    return `#${scope.tag.label}`;
  }

  if (scope.domain) {
    return scope.domain.label;
  }

  if (scope.mode === "actions") {
    return "Actions";
  }

  if (scope.mode === "recents") {
    return "Recents";
  }

  return "Global";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { department: dashboardDepartment, semester: dashboardSemester } =
    useAcademicContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchScope, setSearchScope] = useState<SearchScope>(GLOBAL_SCOPE);
  const [scopeSelectorMode, setScopeSelectorMode] = useState<ScopeSelectorMode | null>(null);
  const [scopeHistory, setScopeHistory] = useState<ScopeHistoryEntry[]>([]);
  const [scopeHistoryCursor, setScopeHistoryCursor] = useState(-1);
  const [isScopeHintSeen, setIsScopeHintSeen] = useState(true);
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
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
          route:
            `/${encodeURIComponent(departmentId)}/${encodeURIComponent(semesterId)}/${encodeURIComponent(item.id)}?name=${encodeURIComponent(item.name)}`,
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
          route:
            `/${encodeURIComponent(departmentId)}/${encodeURIComponent(semesterId)}/${encodeURIComponent(course.driveFolderId)}?name=${encodeURIComponent(course.courseName)}`,
          departmentId,
          semesterId,
        },
      }));

    const existingFolderIds = new Set(
      baseCommands
        .map((item) => item.entityId)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    );

    const offlineFolderCommands = offlineLibrary.folders
      .filter((folder) => !existingFolderIds.has(folder.folderId))
      .map((folder, index) => ({
        id: `offline-folder-${folder.folderId}-${index}`,
        title: folder.path,
        subtitle: `${folder.fileCount} file${folder.fileCount === 1 ? "" : "s"} · Offline folder`,
        keywords: ["offline", "folder", folder.name, folder.path],
        group: "folders" as const,
        scope: "global" as const,
        entityId: folder.folderId,
        payload: {
          route: `/offline-library?folder=${encodeURIComponent(folder.folderId)}`,
          departmentId,
          semesterId,
        },
      }));

    return [...baseCommands, ...offlineFolderCommands];
  }, [
    catalogCourses,
    departmentId,
    driveItems,
    isFolderScope,
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

    return [...courseOptions, ...offlineOnly];
  }, [catalogCourses, offlineLibrary.folders]);

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
          url: item.webViewLink,
          parentFolderId: activeDriveFolderId ?? folderId ?? null,
          departmentId,
          semesterId,
        },
      }));
  }, [activeDriveFolderId, driveItems, folderId, isFolderScope]);

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

      const route =
        `/${encodeURIComponent(departmentId)}/${encodeURIComponent(semesterId)}/${encodeURIComponent(entry.parentFolderId)}?name=${encodeURIComponent(entry.parentFolderName)}`;

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
          url: entry.webViewLink,
          route,
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
          route: `/offline-library?folder=${encodeURIComponent(file.folderId)}`,
          url: `/api/file/${encodeURIComponent(file.fileId)}/stream`,
          parentFolderId: file.folderId,
          departmentId,
          semesterId,
          offlineOnly: true,
        },
      });
      seenEntityIds.add(file.fileId);
    }

    return Array.from(merged.values());
  }, [activeFolderFileCommands, nestedFileCommands, offlineLibrary.files]);
  const deferredQuery = useDeferredValue(query);
  const trimmedDeferredQuery = deferredQuery.trim();

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

    const needle = trimmedDeferredQuery.toLowerCase();
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
    scopeSelectorMode,
    tags,
    trimmedDeferredQuery,
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
    const normalizedQuery = deferredQuery.trim();
    if (normalizedQuery.length < FOLDER_QUERY_MIN_LENGTH) {
      return [];
    }

    const hits = searchFoldersWithIndex(normalizedQuery, folderSearchIndex, 24);

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
  }, [deferredQuery, folderCommandById, folderSearchIndex]);

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
    registry.register("open-offline-library", () => router.push("/offline-library"));
    registry.register("toggle-view", () => undefined);
    registry.register("mark-offline", (item) => {
      if (!item.entityId) {
        return;
      }

      void startDownload(item.entityId);
    });
    return registry;
  }, [router]);

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
        if (parentFolderId !== searchScope.folder.folderId) {
          return false;
        }
      } else if (item.group === "folders") {
        if (item.entityId !== searchScope.folder.folderId) {
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
    const baseResults = commandService.search(deferredQuery, commandContext);
    const normalizedQuery = deferredQuery.trim();
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

    resultItems = resultItems.slice(0, 24);
    const endedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    return {
      exactResults: resultItems,
      durationMs: Math.max(0, endedAt - startedAt),
    };
  }, [
    commandContext,
    commandService,
    deferredQuery,
    fuzzyFolderResults,
    searchScope,
    matchesScopedFilters,
  ]);
  const exactResults = searchSnapshot.exactResults;
  const searchDurationMs = searchSnapshot.durationMs;

  const fallbackResults = useMemo(() => {
    const base = commandService.search("", commandContext);
    if (isScopeEmpty(searchScope)) {
      return base.slice(0, 10);
    }

    return base.filter(matchesScopedFilters).slice(0, 10);
  }, [commandContext, commandService, matchesScopedFilters, searchScope]);

  const showingFallbackResults =
    trimmedDeferredQuery.length > 0 && exactResults.length === 0;
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

  const displayResults = useMemo(
    () => (scopeSelectorMode ? scopeSelectorItems : results),
    [results, scopeSelectorItems, scopeSelectorMode],
  );
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
    if (!open) {
      return;
    }

    for (const item of displayResults.slice(0, 6)) {
      const route = item.payload?.route;
      if (typeof route === "string" && route.length > 0) {
        void router.prefetch(route);
      }
    }
  }, [displayResults, open, router]);

  const handleOpenPalette = useCallback(() => {
    vibrate(8);
    setOpen(true);
  }, []);

  const handleClosePalette = useCallback(() => {
    vibrate(6);
    setOpen(false);
    setScopeSelectorMode(null);
  }, []);

  const handleQueryChange = useCallback((nextValue: string) => {
    setScopeHistoryCursor(-1);
    if (scopeSelectorMode) {
      setQuery(nextValue);
      return;
    }

    if (nextValue.startsWith("/")) {
      setScopeSelectorMode("folders");
      setQuery(nextValue.slice(1));
      markScopeUsage();
      return;
    }

    if (nextValue.startsWith("#")) {
      setScopeSelectorMode("tags");
      setQuery(nextValue.slice(1));
      markScopeUsage();
      return;
    }

    if (nextValue.startsWith(":")) {
      setScopeSelectorMode("domains");
      setQuery(nextValue.slice(1));
      markScopeUsage();
      return;
    }

    if (nextValue.startsWith(">")) {
      applyScope({
        ...searchScope,
        mode: "actions",
      });
      setQuery(nextValue.slice(1));
      return;
    }

    if (nextValue.startsWith("@")) {
      applyScope({
        ...searchScope,
        mode: "recents",
      });
      setQuery(nextValue.slice(1));
      return;
    }

    setQuery(nextValue);
  }, [applyScope, markScopeUsage, scopeSelectorMode, searchScope]);

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
        router.push(route);
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
          return;
        }
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        if (scopeSelectorMode) {
          vibrate(6);
          setScopeSelectorMode(null);
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
  }, [applyScope, open, query, scopeHistory, scopeSelectorMode, searchScope]);

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
    );
  const panelHeight = Math.min(
    880,
    Math.max(360, (viewportMetrics.height || 760) - 24),
  );
  const overlayTopInset = Math.max(12, viewportMetrics.offsetTop + 12);
  const overlayBottomInset = Math.max(12, viewportMetrics.keyboardInset + 12);
  const listBottomInset = Math.max(18, viewportMetrics.keyboardInset + 12);
  const inputCenterOffset = useMemo(() => {
    if (!isCoarsePointer || trimmedDeferredQuery.length === 0) {
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
    isCoarsePointer,
    panelHeight,
    trimmedDeferredQuery.length,
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

  const activeScopeLabel = useMemo(() => {
    if (scopePills.length === 0) {
      return "Global";
    }
    return scopePills.map((pill) => pill.label).join(" + ");
  }, [scopePills]);

  const scopeInputPaddingClass = useMemo(() => {
    if (scopePills.length === 0) {
      return "";
    }

    if (scopePills.length === 1) {
      return "pl-40";
    }
    if (scopePills.length === 2) {
      return "pl-52";
    }
    return "pl-64";
  }, [scopePills.length]);

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
        onOpenPalette={() => setOpen(true)}
        placeholder={placeholder}
      />

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.durations.normal }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/88 backdrop-blur-md"
            style={{
              paddingTop: overlayTopInset,
              paddingBottom: overlayBottomInset,
              paddingLeft: 12,
              paddingRight: 12,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.99 }}
              transition={{ type: "spring", ...motionTokens.spring }}
              className="mx-auto flex w-full max-w-3xl min-h-0 flex-col rounded-2xl border border-border/70 bg-card/95 p-2 shadow-2xl border-border/80 bg-card/95"
              style={{ height: panelHeight }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
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
                        : `${exactResults.length} result${exactResults.length === 1 ? "" : "s"} · ${searchDurationMs < 10 ? searchDurationMs.toFixed(2) : searchDurationMs.toFixed(1)} ms${shouldApplyRecencyBias ? " · recency boost" : ""}${isNestedIndexing ? " · refreshing nested index" : ""}`}
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
                className="flex min-h-0 flex-1 rounded-xl border border-border/60 bg-card p-1 shadow-inner border-border/80 bg-card"
                onKeyDown={(e) => {
                  const flatItems = displayResults;
                  const totalItems = flatItems.length;

                  if (e.key === "Backspace" && query.trim().length === 0) {
                    if (scopeSelectorMode) {
                      e.preventDefault();
                      setScopeSelectorMode(null);
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
                    scale: trimmedDeferredQuery ? 1.02 : 1,
                    marginTop: inputCenterOffset,
                  }}
                  transition={{ type: "spring", ...motionTokens.spring }}
                  className="relative mx-auto w-full max-w-2xl"
                >
                  {scopePills.length > 0 ? (
                    <div className="pointer-events-none absolute left-3 top-1/2 z-20 -translate-y-1/2">
                      <div className="pointer-events-auto flex max-w-80 items-center gap-1 overflow-hidden">
                        {scopePills.map((pill) => (
                          <span key={pill.key} className="inline-flex max-w-36 items-center gap-1 rounded-full border border-border/80 bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                            {pill.icon === "folder" ? (
                              <IconFolder className="size-3 text-primary" />
                            ) : pill.icon === "tag" ? (
                              <IconTag className="size-3 text-primary" />
                            ) : pill.icon === "domain" ? (
                              <IconDatabase className="size-3 text-primary" />
                            ) : pill.label === "Actions" ? (
                              <IconBolt className="size-3 text-primary" />
                            ) : (
                              <IconClockHour4 className="size-3 text-primary" />
                            )}
                            <span className="truncate">{pill.label}</span>
                            <button
                              type="button"
                              className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                              onClick={pill.onRemove}
                              aria-label={`Remove ${pill.label} scope`}
                            >
                              <IconX className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <CommandInput
                    value={query}
                    onValueChange={handleQueryChange}
                    placeholder={placeholder}
                    autoFocus
                    className={cn(
                      scopeInputPaddingClass,
                      trimmedDeferredQuery ? "pr-10" : undefined,
                    )}
                  />
                  {trimmedDeferredQuery ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-2.5 top-1/2 z-10 -translate-y-1/2"
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
                </motion.div>

                {!query.trim() && !scopeSelectorMode ? (
                  <div className="space-y-2 px-2 pb-1 pt-2">
                    <div className="flex flex-wrap gap-2">
                      {QUICK_QUERIES.map((quickQuery) => {
                        const QuickIcon = quickQuery.icon;
                        return (
                          <Button
                            key={quickQuery.query}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              vibrate(6);
                              handleQueryChange(quickQuery.query);
                              pushRecentQuery(quickQuery.query);
                            }}
                            className="h-7 rounded-full"
                          >
                            <QuickIcon className="size-3.5" />
                            {quickQuery.label}
                          </Button>
                        );
                      })}
                    </div>
                    {recentQueries.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <IconClockHour4 className="size-3.5" />
                          Recent
                        </span>
                        {recentQueries.map((recentQuery) => (
                          <Button
                            key={recentQuery}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              vibrate(6);
                              setQuery(recentQuery);
                              pushRecentQuery(recentQuery);
                              setScopeHistoryCursor(-1);
                            }}
                            className="h-7 rounded-full border border-border/70 px-2.5 border-border/70"
                          >
                            {recentQuery}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                    {!isScopeHintSeen ? (
                      <p className="px-1 text-[11px] text-muted-foreground">
                        Scope hints: <span className="font-medium">/</span> folder, <span className="font-medium">#</span> tag, <span className="font-medium">:</span> dept/semester, <span className="font-medium">&gt;</span> actions, <span className="font-medium">@</span> recents
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <CommandList
                  ref={listRef}
                  className="min-h-0 flex-1 rounded-lg border border-transparent p-1"
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
                          <p className="text-xs font-medium text-foreground/80 text-muted-foreground">
                            {scopeSelectorMode
                              ? `No ${scopeSelectorMode === "folders" ? "folders" : scopeSelectorMode === "tags" ? "tags" : "scope options"} for "${trimmedDeferredQuery || "..."}"`
                              : hasAnyScope
                                ? `No files in ${activeScopeLabel} match "${trimmedDeferredQuery || "..."}"`
                                : `No results for "${trimmedDeferredQuery || "..."}"`}
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
                        const meta = GROUP_META[group.group];
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
                              initial="hidden"
                              animate="visible"
                            >
                            {group.items.map((item) => {
                              const ItemIcon = getCommandIcon(item);
                              const itemIconTone = getCommandIconTone(item);
                              const isOfflineFile =
                                item.group === "files"
                                && Boolean(item.entityId)
                                && (item.payload?.offlineOnly === true || Boolean(item.entityId && offlineFiles[item.entityId]));
                              const contentBadge = getContentBadge(item);
                              const flatIndex = displayResults.indexOf(item);
                              const isActive = flatIndex === activeIndex;

                              return (
                                <motion.div
                                  key={item.id}
                                  variants={staggerItem}
                                  ref={isActive ? activeItemRef : undefined}
                                >
                                <CommandItem
                                  value={item.id}
                                  className={cn(
                                    "min-h-12 rounded-lg transition-all duration-150",
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
                                      <HighlightedText text={item.title} query={trimmedDeferredQuery} />
                                    </div>
                                    {item.subtitle ? (
                                      <div className="truncate text-[11px] text-muted-foreground">
                                        <HighlightedText
                                          text={item.subtitle}
                                          query={trimmedDeferredQuery}
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
                <div className="mt-1 flex items-center justify-between rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted-foreground border-border/70 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="rounded border border-border/80 px-1 py-px text-[9px] border-border">
                      {activeScopeLabel}
                    </span>
                    {showLoadingSkeleton
                      ? "Preparing context index..."
                      : `${displayResults.length} result${displayResults.length === 1 ? "" : "s"}`}
                  </span>
                  <span className="hidden sm:inline">↑↓ Navigate · Enter Open · Esc Close · Alt+↓ Next Group</span>
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
