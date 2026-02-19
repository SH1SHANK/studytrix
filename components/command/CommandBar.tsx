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
import { AnimatePresence, motion, type Easing } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    tone: "bg-sky-50/80 dark:bg-sky-500/12",
    iconTone: "text-sky-600 dark:text-sky-300",
  },
  folders: {
    label: "Folders",
    icon: IconFolder,
    tone: "bg-indigo-50/80 dark:bg-indigo-500/12",
    iconTone: "text-indigo-600 dark:text-indigo-300",
  },
  files: {
    label: "Files",
    icon: IconFile,
    tone: "bg-emerald-50/80 dark:bg-emerald-500/12",
    iconTone: "text-emerald-600 dark:text-emerald-300",
  },
  actions: {
    label: "Actions",
    icon: IconBolt,
    tone: "bg-amber-50/80 dark:bg-amber-500/12",
    iconTone: "text-amber-600 dark:text-amber-300",
  },
  system: {
    label: "System",
    icon: IconSparkles,
    tone: "bg-violet-50/80 dark:bg-violet-500/12",
    iconTone: "text-violet-600 dark:text-violet-300",
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
];

const DEPARTMENT_SEGMENT_PATTERN = /^[A-Z]{2,5}$/;
const RECENT_QUERY_STORAGE_KEY = "studytrix.command.recentQueries.v1";
const MAX_RECENT_QUERIES = 6;
const RECENT_COMMAND_STORAGE_KEY = "studytrix.command.recentCommands.v1";
const MAX_RECENT_COMMANDS = 24;
const NESTED_INDEX_TTL_MS = 30 * 60 * 1000;

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

function buildRootSignature(roots: readonly NestedRootPayload[]): string {
  return [...roots]
    .map((root) => `${root.courseCode}:${root.folderId}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
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
    return "text-indigo-600 dark:text-indigo-300";
  }

  if (item.group === "files") {
    return "text-emerald-600 dark:text-emerald-300";
  }

  if (item.id === "open-settings") {
    return "text-sky-600 dark:text-sky-300";
  }

  if (item.id === "open-storage") {
    return "text-amber-600 dark:text-amber-300";
  }

  if (item.id.startsWith("tag:")) {
    return "text-fuchsia-600 dark:text-fuchsia-300";
  }

  if (item.group === "navigation") {
    return "text-sky-600 dark:text-sky-300";
  }

  if (item.group === "actions") {
    return "text-amber-600 dark:text-amber-300";
  }

  return "text-violet-600 dark:text-violet-300";
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
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([]);
  const [nestedFileEntries, setNestedFileEntries] = useState<NestedCommandFileEntry[]>([]);
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
  const [activeIndex, setActiveIndex] = useState(0);

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
    () => buildRootSignature(nestedRoots),
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

  const folderCommands = useMemo<EngineCommandItem[]>(() => {
    if (isFolderScope) {
      return driveItems.filter(isDriveFolder).map((item) => ({
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
        },
      }));
    }

    return catalogCourses.map((course) => ({
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
      },
    }));
  }, [catalogCourses, departmentId, driveItems, isFolderScope, semesterId]);

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
        },
      }));
  }, [driveItems, isFolderScope]);

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
        },
      };
    });
  }, [departmentId, nestedFileEntries, semesterId]);

  const fileCommands = useMemo<EngineCommandItem[]>(() => {
    const merged = new Map<string, EngineCommandItem>();

    for (const item of nestedFileCommands) {
      merged.set(item.id, item);
    }

    for (const item of activeFolderFileCommands) {
      merged.set(item.id, item);
    }

    return Array.from(merged.values());
  }, [activeFolderFileCommands, nestedFileCommands]);
  const deferredQuery = useDeferredValue(query);
  const trimmedDeferredQuery = deferredQuery.trim();

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
    registry.register("toggle-view", () => undefined);
    registry.register("mark-offline", (item) => {
      if (!item.entityId) {
        return;
      }

      void startDownload(item.entityId);
    });
    return registry;
  }, [router]);

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

    resultItems = resultItems.slice(0, 24);
    const endedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    return {
      exactResults: resultItems,
      durationMs: Math.max(0, endedAt - startedAt),
    };
  }, [commandContext, commandService, deferredQuery, fuzzyFolderResults]);
  const exactResults = searchSnapshot.exactResults;
  const searchDurationMs = searchSnapshot.durationMs;

  const fallbackResults = useMemo(() => {
    return commandService.search("", commandContext).slice(0, 10);
  }, [commandContext, commandService]);

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

  const groupedResults = useMemo(() => {
    const groups = new Map<EngineCommandGroup, EngineCommandItem[]>();

    for (const item of results) {
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
  }, [results]);

  useEffect(() => {
    if (!open) {
      return;
    }

    for (const item of results.slice(0, 6)) {
      const route = item.payload?.route;
      if (typeof route === "string" && route.length > 0) {
        void router.prefetch(route);
      }
    }
  }, [open, results, router]);

  const handleOpenPalette = useCallback(() => {
    vibrate(8);
    setOpen(true);
  }, []);

  const handleClosePalette = useCallback(() => {
    vibrate(6);
    setOpen(false);
  }, []);

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
      pushRecentQuery(trimmedDeferredQuery);
      pushRecentCommandId(item.id);

      const externalUrl = item.payload?.url;
      const isOfflineFile = item.group === "files" && !!item.entityId && !!offlineFiles[item.entityId];
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
    [dispatcher, offlineFiles, pushRecentCommandId, pushRecentQuery, router, trimmedDeferredQuery],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
    setRecentQueries(loadRecentQueries());
    setRecentCommandIds(loadRecentCommandIds());
  }, []);

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

      if (event.key === "Escape" && open) {
        event.preventDefault();
        if (query.trim().length > 0) {
          // First Escape: clear query but keep palette open
          vibrate(6);
          setQuery("");
        } else {
          // Second Escape: close palette
          setOpen(false);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

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
      setActiveIndex(0);
    });
  }, [pathname]);

  const showLoadingSkeleton =
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

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 left-4 right-4 z-40 mx-auto w-auto max-w-3xl transition-all duration-200",
          open ? "pointer-events-none translate-y-2 opacity-0" : "opacity-100",
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenPalette}
          className="h-auto w-full rounded-full p-0 text-left shadow-lg"
          aria-label="Open command bar"
        >
          <Command
            className={cn(
              "rounded-full border border-stone-200/70 bg-white p-0 shadow-lg transition-all duration-200 hover:-translate-y-px hover:border-stone-300",
              "dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-600",
            )}
          >
            <div className="flex h-12 items-center gap-3 px-4 text-sm text-stone-500 dark:text-stone-400">
              <IconSearch className="size-4" />
              <span>{placeholder}</span>
              <CommandShortcut className="hidden sm:inline">⌘K</CommandShortcut>
              <span className="ml-auto rounded-md border border-stone-300 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-500 dark:border-stone-700 dark:text-stone-400">
                {isFolderScope ? activeFolderTitle : "Global"}
              </span>
            </div>
          </Command>
        </Button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.durations.normal }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-50/90 backdrop-blur-md dark:bg-stone-950/90"
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
              className="mx-auto flex w-full max-w-3xl min-h-0 flex-col rounded-2xl border border-stone-200/70 bg-white/95 p-2 shadow-2xl dark:border-stone-700/80 dark:bg-stone-900/95"
              style={{ height: panelHeight }}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                  <IconSparkles className="size-3.5" />
                  <span>
                    {showLoadingSkeleton
                      ? "Indexing context..."
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
                className="flex min-h-0 flex-1 rounded-xl border border-stone-200/60 bg-white p-1 shadow-inner dark:border-stone-700/80 dark:bg-stone-900"
                onKeyDown={(e) => {
                  const flatItems = results;
                  const totalItems = flatItems.length;
                  if (totalItems === 0) return;

                  // Ctrl+N / Ctrl+P vim-style navigation
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
                    executeCommand(flatItems[activeIndex]);
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
                  <CommandInput
                    value={query}
                    onValueChange={(nextValue) => setQuery(nextValue)}
                    placeholder={placeholder}
                    autoFocus
                    className={trimmedDeferredQuery ? "pr-10" : undefined}
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
                      }}
                    >
                      <IconX className="size-3.5" />
                      <span className="sr-only">Clear query</span>
                    </Button>
                  ) : null}
                </motion.div>

                {!query.trim() ? (
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
                              setQuery(quickQuery.query);
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
                        <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
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
                            }}
                            className="h-7 rounded-full border border-stone-200/70 px-2.5 dark:border-stone-700/70"
                          >
                            {recentQuery}
                          </Button>
                        ))}
                      </div>
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
                        <div key={`command-skeleton-${index}`} className="space-y-1.5 rounded-lg border border-stone-200/60 p-2 dark:border-stone-700/70">
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-2.5 w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {showingFallbackResults ? (
                        <div className="mx-1 mb-2 rounded-lg border border-amber-300/60 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-600/50 dark:bg-amber-900/20 dark:text-amber-300">
                          No exact matches. Showing top commands instead.
                        </div>
                      ) : null}
                      <CommandEmpty>
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <IconSearch className="size-4 text-stone-400" />
                          <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                            No results for &quot;{trimmedDeferredQuery || "..."}&quot;
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">
                            Try: <span className="font-medium">settings</span>, <span className="font-medium">storage</span>, <span className="font-medium">tag</span>
                          </p>
                        </div>
                      </CommandEmpty>

                      {groupedResults.map((group) => {
                        const meta = GROUP_META[group.group];
                        const GroupIcon = meta.icon;

                        return (
                          <CommandGroup key={group.group}>
                            <div className="mb-1 flex items-center justify-between px-2.5 pt-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
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
                                && Boolean(item.entityId && offlineFiles[item.entityId]);
                              const contentBadge = getContentBadge(item);
                              const flatIndex = results.indexOf(item);
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
                                      ? "bg-indigo-50/80 ring-1 ring-indigo-400/30 dark:bg-indigo-500/15 dark:ring-indigo-400/20"
                                      : "data-[selected=true]:translate-x-0.5",
                                  )}
                                  onSelect={() => executeCommand(item)}
                                  onMouseEnter={() => setActiveIndex(flatIndex)}
                                  data-active={isActive}
                                >
                                  <div className="flex size-8 items-center justify-center rounded-md border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800">
                                    <ItemIcon className={cn("size-4", itemIconTone)} />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">
                                      <HighlightedText text={item.title} query={trimmedDeferredQuery} />
                                    </div>
                                    {item.subtitle ? (
                                      <div className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                                        <HighlightedText
                                          text={item.subtitle}
                                          query={trimmedDeferredQuery}
                                        />
                                      </div>
                                    ) : null}
                                  </div>

                                  {isOfflineFile ? (
                                    <span className="rounded-full border border-emerald-300/80 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                                      Offline
                                    </span>
                                  ) : null}

                                  {contentBadge ? (
                                    <span className="shrink-0 rounded-full border border-stone-200/80 bg-stone-50 px-1.5 py-0.5 text-[10px] font-medium text-stone-500 dark:border-stone-700/80 dark:bg-stone-800 dark:text-stone-400">
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
                <div className="mt-1 flex items-center justify-between rounded-md border border-stone-200/70 px-2 py-1 text-[10px] text-stone-500 dark:border-stone-700/70 dark:text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <span className="rounded border border-stone-300/80 px-1 py-px text-[9px] dark:border-stone-600">
                      {isFolderScope ? activeFolderTitle : "Global"}
                    </span>
                    {showLoadingSkeleton
                      ? "Preparing context index..."
                      : `${exactResults.length} result${exactResults.length === 1 ? "" : "s"}`}
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
