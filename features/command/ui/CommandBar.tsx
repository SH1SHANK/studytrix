"use client";

import {
  useCallback,
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
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { DEPARTMENT_MAP, getDepartmentName } from "@/lib/academic";
import { Button } from "@/components/ui/button";
import { FloatingDock } from "@/components/layout/FloatingDock";
import { useAcademicContext } from "@/components/layout/AcademicContext";
import {
  Command,
} from "@/components/ui/command";
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
import { useCustomFoldersTabsStore } from "@/features/custom-folders/custom-folders.tabs.store";
import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";
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
  isEssentialActionActive,
  resolveEssentialScopeTransition,
  shouldShowEssentialScopeBar,
} from "@/features/command/command.scope-ui";
import { useDownloadRiskGate } from "@/ui/hooks/useDownloadRiskGate";
import { buildIntelligenceSnapshotKey } from "@/features/intelligence/intelligence.client";
import { mergeSemanticKeywordResults } from "@/features/intelligence/intelligence.merge";
import { expandSemanticQuery } from "@/features/intelligence/intelligence.synonyms";
import { useIntelligenceStore } from "@/features/intelligence/intelligence.store";
import { useOnboardingStore } from "@/features/onboarding/onboarding.store";
import type {
  IntelligenceSearchHit,
  SearchScope as NavigationSearchScope,
} from "@/features/intelligence/intelligence.types";
import { shouldMergeSemanticResults, shouldRunSemanticQuery } from "@/features/intelligence/intelligence.fallbacks";
import {
  DEFAULT_MODEL_ID,
  INTELLIGENCE_SETTINGS_IDS,
  INTELLIGENCE_QUERY_DEBOUNCE_MS,
} from "@/features/intelligence/intelligence.constants";
import { getRelativePath } from "@/features/intelligence/intelligence.utils";
import { CommandInputSection } from "@/features/command/ui/CommandInputSection";
import { CommandResultsList } from "@/features/command/ui/CommandResultsList";
import { useCommandKeyboardNavigation } from "@/features/command/ui/useCommandKeyboardNavigation";
import { useCommandScopeState } from "@/features/command/ui/useCommandScopeState";
import {
  buildBreadcrumbFromTrail,
  CMD_QUERY_PARAM,
  CMD_SCOPE_PARAM,
  CMD_TEXT_PARAM,
  DEPARTMENT_SEGMENT_PATTERN,
  EMPTY_OFFLINE_LIBRARY,
  ESSENTIAL_SCOPE_ACTIONS,
  getCourseSubtitle,
  GLOBAL_SCOPE,
  GROUP_ORDER,
  isScopeEmpty,
  loadRecentCommandIds,
  loadRecentQueries,
  MAX_RECENT_COMMANDS,
  MAX_RECENT_QUERIES,
  NESTED_INDEX_TTL_MS,
  parseNestedFileEntries,
  parseScopeFromSerialized,
  parseSemesterId,
  parseString,
  persistRecentCommandIds,
  persistRecentQueries,
  REPOSITORY_SCOPE_LABEL,
  resolvePrefixModeDescriptor,
  titleCaseSegment,
  type NestedRootPayload,
  vibrate,
  writeScopeSummary,
} from "@/features/command/ui/command-bar.helpers";


type CommandBarProps = {
  placeholder?: string;
  navigationScope?: NavigationSearchScope;
};

export function CommandBar({
  placeholder = "Search folders, files and actions",
  navigationScope = { kind: "global-root" },
}: CommandBarProps) {
  const gateDownloadRisk = useDownloadRiskGate();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { department: dashboardDepartment, semester: dashboardSemester } =
    useAcademicContext();
  const activeRepositoryPage = useCustomFoldersTabsStore((state) => state.activePage);
  const setActiveRepositoryPage = useCustomFoldersTabsStore((state) => state.setActivePage);
  const personalFolders = useCustomFoldersStore((state) => state.folders);
  const personalFolderIds = useMemo(
    () => new Set(personalFolders.map((folder) => folder.id)),
    [personalFolders],
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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
  const [personalRepositoryVisibleSetting] = useSetting("personal_repository_visible");
  const [smartSearchEnabledSetting] = useSetting(INTELLIGENCE_SETTINGS_IDS.smartSearchEnabled);
  const onboardingActive = useOnboardingStore((state) => state.active);
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
  const personalRepositoryVisible = personalRepositoryVisibleSetting !== false;
  const intelligenceSmartSearchEnabled = smartSearchEnabledSetting === true;
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [semanticQueryInput, setSemanticQueryInput] = useState("");
  const [semanticHitScores, setSemanticHitScores] = useState<Map<string, number>>(new Map());
  const [crossRepoSemanticHits, setCrossRepoSemanticHits] = useState<IntelligenceSearchHit[]>([]);
  const [crossRepoAbovePrimary, setCrossRepoAbovePrimary] = useState(false);
  const [semanticQueryPending, setSemanticQueryPending] = useState(false);
  const [semanticQueryTimedOut, setSemanticQueryTimedOut] = useState(false);
  const [semanticQueryError, setSemanticQueryError] = useState<string | null>(null);
  const [newlyAppearedSemanticIds, setNewlyAppearedSemanticIds] = useState<Set<string>>(new Set());
  const previousSemanticIdsRef = useRef<Set<string>>(new Set());
  const semanticEnterTimerRef = useRef<number | null>(null);
  const semanticQuerySeqRef = useRef(0);
  const placeholderContainerRef = useRef<HTMLDivElement>(null);
  const placeholderMeasureRef = useRef<HTMLSpanElement>(null);
  const lastIntelligenceInitKeyRef = useRef("");
  const setIntelligenceEnabled = useIntelligenceStore((state) => state.setEnabled);
  const deactivateIntelligenceRuntime = useIntelligenceStore((state) => state.deactivateRuntime);
  const initializeIntelligence = useIntelligenceStore((state) => state.initialize);
  const queryScopedSemantic = useIntelligenceStore((state) => state.queryScopedSemantic);
  const intelligenceRuntimeStatus = useIntelligenceStore((state) => state.runtimeStatus);

  const replaceUrl = useCallback((nextUrl: string) => {
    router.replace(nextUrl, { scroll: false });
  }, [router]);
  const {
    activeNavigationScope,
    setActiveNavigationScope,
    searchScope,
    scopeSelectorMode,
    setScopeSelectorMode,
    stickyPrefixMode,
    setStickyPrefixMode,
    scopeHistory,
    scopeHistoryCursor,
    setScopeHistoryCursor,
    scopedPlaceholder,
    applyScope,
    clearStickyPrefixMode,
    activatePrefixMode,
    handleClearSearchAndScope,
    handleQueryChange,
    pushScopeHistory,
  } = useCommandScopeState({
    navigationScope,
    activeRepositoryPage,
    query,
    open,
    pathname,
    searchParams,
    setQuery,
    placeholderContainerRef,
    placeholderMeasureRef,
    onReplaceUrl: replaceUrl,
  });
  const shouldComputeCommandData = open || scopeSelectorMode !== null;

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

  useEffect(() => {
    if (!personalRepositoryVisible && activeRepositoryPage === "personal") {
      setActiveRepositoryPage("global");
    }
  }, [activeRepositoryPage, personalRepositoryVisible, setActiveRepositoryPage]);

  const nestedRoots = useMemo<NestedRootPayload[]>(
    () => {
      if (activeRepositoryPage === "personal") {
        return personalFolders
          .map((folder, index) => ({
            folderId: folder.id,
            courseCode: `PR${index + 1}`,
            courseName: folder.label,
          }))
          .filter((root) => root.folderId.length > 0);
      }

      return catalogCourses
        .map((course) => ({
          folderId: course.driveFolderId,
          courseCode: course.courseCode.toUpperCase(),
          courseName: course.courseName,
        }))
        .filter((root) => root.folderId.length > 0);
    },
    [activeRepositoryPage, catalogCourses, personalFolders],
  );
  const nestedRootSignature = useMemo(
    () => buildNestedRootSignature(nestedRoots),
    [nestedRoots],
  );
  const nestedScopeKey = useMemo(
    () =>
      activeRepositoryPage === "personal"
        ? buildNestedCommandScopeKey("PERSONAL", "0")
        : buildNestedCommandScopeKey(departmentId, semesterId),
    [activeRepositoryPage, departmentId, semesterId],
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
  const currentFolderPath = useMemo(() => {
    if (activeNavigationScope.kind !== "folder") {
      return "";
    }

    return [
      ...activeNavigationScope.breadcrumb.map((entry) => entry.folderName),
      activeNavigationScope.folderName,
    ].join(" > ");
  }, [activeNavigationScope]);

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

  useEffect(() => () => {
    if (semanticEnterTimerRef.current !== null) {
      window.clearTimeout(semanticEnterTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!open || !isFolderScope || !activeDriveFolderId) {
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
  }, [activeDriveFolderId, isFolderScope, open]);

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

    if (!open) {
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
    open,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const refreshOfflineLibrary = async () => {
      try {
        const snapshot = await loadOfflineLibrarySnapshot({
          force: true,
          maxAgeMs: 8_000,
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

  const handleResetNavigationScope = useCallback((repoKind: "global" | "personal") => {
    setActiveNavigationScope(repoKind === "personal"
      ? { kind: "personal-root" }
      : { kind: "global-root" });
    setQuery("");
    setSemanticHitScores(new Map());
    setCrossRepoSemanticHits([]);
    setCrossRepoAbovePrimary(false);
  }, [setActiveNavigationScope]);
  const handleCollapseNavigationScope = useCallback((next: {
    folderId: string;
    folderName: string;
    repoKind: "global" | "personal";
    breadcrumb: Array<{ folderId: string; folderName: string }>;
  }) => {
    setActiveNavigationScope({
      kind: "folder",
      folderId: next.folderId,
      folderName: next.folderName,
      repoKind: next.repoKind,
      breadcrumb: next.breadcrumb,
    });
    setQuery("");
    setSemanticHitScores(new Map());
    setCrossRepoSemanticHits([]);
    setCrossRepoAbovePrimary(false);
  }, [setActiveNavigationScope]);

  const removeLastScopePill = useCallback(() => {
    if (searchScope.mode !== "global") {
      applyScope({ ...searchScope, mode: "global" });
      return;
    }

    if (searchScope.tag) {
      applyScope({ ...searchScope, tag: null });
      return;
    }

    if (activeNavigationScope.kind === "folder") {
      handleResetNavigationScope(activeNavigationScope.repoKind);
      return;
    }

    if (searchScope.domain) {
      applyScope({ ...searchScope, domain: null });
    }
  }, [activeNavigationScope, applyScope, handleResetNavigationScope, searchScope]);

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
      : activeRepositoryPage === "personal"
        ? personalFolders.map((folder) => ({
          id: `personal-folder-${folder.id}`,
          title: folder.label,
          subtitle: `${folder.fileCount} file${folder.fileCount === 1 ? "" : "s"} · ${folder.folderCount} folder${folder.folderCount === 1 ? "" : "s"}`,
          keywords: ["personal", "folder", folder.label],
          group: "folders",
          scope: "global",
          entityId: folder.id,
          payload: {
            route: buildFolderRouteHref({
              departmentId,
              semesterId,
              folderId: folder.id,
              folderName: folder.label,
              trailLabels: [folder.label],
              trailIds: [folder.id],
            }),
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
      if (activeRepositoryPage === "personal" && !personalFolderIds.has(folder.folderId)) {
        continue;
      }
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
    activeRepositoryPage,
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
    personalFolderIds,
    personalFolders,
    semesterId,
  ]);

  const folderScopeOptions = useMemo(() => {
    type FolderScopeOption = {
      folderId: string;
      label: string;
      subtitle: string;
      trailIds: string[];
      trailLabels: string[];
    };

    const courseOptions = activeRepositoryPage === "personal"
      ? personalFolders.map((folder) => ({
        folderId: folder.id,
        label: folder.label,
        subtitle: `${folder.fileCount} file${folder.fileCount === 1 ? "" : "s"} · ${folder.folderCount} folder${folder.folderCount === 1 ? "" : "s"}`,
        trailIds: [folder.id],
        trailLabels: [folder.label],
      }))
      : catalogCourses
        .filter((course) => course.driveFolderId.trim().length > 0)
        .map((course) => ({
          folderId: course.driveFolderId,
          label: course.courseName,
          subtitle: course.courseCode,
          trailIds: [course.driveFolderId],
          trailLabels: [course.courseName],
        }));

    const known = new Set(courseOptions.map((item) => item.folderId));
    const offlineOnly: FolderScopeOption[] = offlineLibrary.folders
      .filter((folder) => !known.has(folder.folderId))
      .filter((folder) => activeRepositoryPage === "global" || personalFolderIds.has(folder.folderId))
      .map((folder) => ({
        folderId: folder.folderId,
        label: folder.path,
        subtitle: `${folder.fileCount} offline file${folder.fileCount === 1 ? "" : "s"}`,
        trailIds: [folder.folderId],
        trailLabels: folder.path
          .split(" / ")
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      }));

    const knownOrOffline = new Set([...known, ...offlineOnly.map((item) => item.folderId)]);
    const nestedOnly: FolderScopeOption[] = [];

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
          trailIds: ancestryIds.slice(0, index + 1),
          trailLabels: ancestryNames.slice(0, index + 1),
        });
        knownOrOffline.add(folderId);
      }
    }

    return [...courseOptions, ...offlineOnly, ...nestedOnly];
  }, [activeRepositoryPage, catalogCourses, nestedFileEntries, offlineLibrary.folders, personalFolderIds, personalFolders]);

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
      if (activeRepositoryPage === "personal" && !personalFolderIds.has(file.folderId)) {
        continue;
      }

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
  }, [activeFolderFileCommands, activeRepositoryPage, departmentId, nestedFileCommands, offlineLibrary.files, personalFolderIds, semesterId]);
  const semanticCommands = useMemo<EngineCommandItem[]>(
    () => [...folderCommands, ...fileCommands].filter((item) => item.group === "folders" || item.group === "files"),
    [fileCommands, folderCommands],
  );
  const resolvedIntelligenceModelId = DEFAULT_MODEL_ID;
  const intelligenceSnapshotKey = useMemo(
    () => resolvedIntelligenceModelId
      ? buildIntelligenceSnapshotKey("library", resolvedIntelligenceModelId)
      : null,
    [resolvedIntelligenceModelId],
  );

  useEffect(() => {
    setIntelligenceEnabled(intelligenceSmartSearchEnabled);

    if (!intelligenceSmartSearchEnabled) {
      lastIntelligenceInitKeyRef.current = "";
      void deactivateIntelligenceRuntime();
      semanticQuerySeqRef.current += 1;
      setSemanticHitScores(new Map());
      setCrossRepoSemanticHits([]);
      setCrossRepoAbovePrimary(false);
      setSemanticQueryError(null);
      setSemanticQueryPending(false);
      setSemanticQueryTimedOut(false);
      return;
    }
  }, [
    deactivateIntelligenceRuntime,
    intelligenceSmartSearchEnabled,
    setIntelligenceEnabled,
  ]);

  useEffect(() => {
    if (
      !intelligenceSmartSearchEnabled
      || !resolvedIntelligenceModelId
      || !intelligenceSnapshotKey
    ) {
      return;
    }

    const personalSignature = personalFolders
      .map((folder) => `${folder.id}:${folder.label}`)
      .sort((left, right) => left.localeCompare(right))
      .join("|");
    const initKey = `${resolvedIntelligenceModelId}::${intelligenceSnapshotKey}::${personalSignature}`;
    if (
      lastIntelligenceInitKeyRef.current === initKey
      && intelligenceRuntimeStatus !== "error"
    ) {
      return;
    }
    lastIntelligenceInitKeyRef.current = initKey;

    void initializeIntelligence({
      modelId: resolvedIntelligenceModelId,
      snapshotKey: intelligenceSnapshotKey,
      customFolders: personalFolders,
    });
  }, [
    initializeIntelligence,
    intelligenceRuntimeStatus,
    intelligenceSmartSearchEnabled,
    intelligenceSnapshotKey,
    personalFolders,
    resolvedIntelligenceModelId,
  ]);

  useEffect(() => {
    if (!shouldRunSemanticQuery({
      enabled: intelligenceSmartSearchEnabled,
      runtimeStatus: intelligenceRuntimeStatus,
      query: semanticQueryInput,
    })) {
      if (semanticQueryInput.trim().length === 0) {
        setSemanticHitScores(new Map());
        setCrossRepoSemanticHits([]);
        setCrossRepoAbovePrimary(false);
        setSemanticQueryPending(false);
      }
      return;
    }

    const sequenceId = semanticQuerySeqRef.current + 1;
    semanticQuerySeqRef.current = sequenceId;
    setSemanticQueryPending(true);
    setSemanticQueryTimedOut(false);
    setSemanticQueryError(null);
    setSemanticHitScores(new Map());

    void queryScopedSemantic({
      query: expandSemanticQuery(semanticQueryInput),
      limit: Math.max(resultLimit, 20),
      scope: activeNavigationScope,
    })
      .then((response) => {
        if (semanticQuerySeqRef.current !== sequenceId) {
          return;
        }

        const mapped = new Map<string, number>();
        for (const hit of response.primary) {
          const entityId = typeof hit.fileId === "string" && hit.fileId.trim().length > 0
            ? hit.fileId.trim()
            : hit.id.trim();
          if (entityId.length === 0) {
            continue;
          }

          const rawScore = hit.semanticScore ?? hit.score;
          const safeScore = Number.isFinite(rawScore)
            ? Math.max(0, Math.min(1, rawScore))
            : 0;
          mapped.set(entityId, safeScore);
        }
        setSemanticHitScores(mapped);
        setCrossRepoSemanticHits(response.crossRepo);
        setCrossRepoAbovePrimary(response.crossRepoAbovePrimary);
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
    activeNavigationScope,
    intelligenceRuntimeStatus,
    intelligenceSmartSearchEnabled,
    queryScopedSemantic,
    resultLimit,
    semanticQueryInput,
  ]);

  const trimmedDeferredQuery = debouncedQuery.trim();
  const effectiveVisualQuery = scopeSelectorMode ? query.trim() : trimmedDeferredQuery;
  const effectiveFolderScope = useMemo(() => {
    if (activeNavigationScope.kind === "folder") {
      return {
        folderId: activeNavigationScope.folderId,
        label: activeNavigationScope.folderName,
      };
    }

    return null;
  }, [activeNavigationScope]);

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
    if (activeRepositoryPage === "personal") {
      return [];
    }

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
  }, [activeRepositoryPage]);

  const currentFolderScopeSuggestion = useMemo(() => {
    if (activeNavigationScope.kind === "folder") {
      const trailIds = [
        ...activeNavigationScope.breadcrumb.map((entry) => entry.folderId),
        activeNavigationScope.folderId,
      ];
      const trailLabels = [
        ...activeNavigationScope.breadcrumb.map((entry) => entry.folderName),
        activeNavigationScope.folderName,
      ];

      return {
        folderId: activeNavigationScope.folderId,
        label: activeNavigationScope.folderName,
        subtitle: "Current folder",
        trailIds,
        trailLabels,
      };
    }

    if (!isFolderScope || !activeDriveFolderId) {
      return null;
    }

    return {
      folderId: activeDriveFolderId,
      label: activeFolderTitle,
      subtitle: "Current folder",
      trailIds: [activeDriveFolderId],
      trailLabels: [activeFolderTitle],
    };
  }, [activeDriveFolderId, activeFolderTitle, activeNavigationScope, isFolderScope]);

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
            trailIds: option.trailIds,
            trailLabels: option.trailLabels,
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
    if (!shouldComputeCommandData) {
      return null;
    }

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
  }, [folderCommands, shouldComputeCommandData]);

  const fuzzyFolderResults = useMemo<EngineCommandItem[]>(() => {
    if (!shouldComputeCommandData || !fuzzySearchEnabled || !folderSearchIndex) {
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
  }, [
    debouncedQuery,
    folderCommandById,
    folderSearchIndex,
    fuzzySearchEnabled,
    resultLimit,
    shouldComputeCommandData,
  ]);

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
    if (!shouldComputeCommandData) {
      return null;
    }

    const index = buildCommandIndex(
      folderCommands,
      fileCommands,
      isFolderScope ? "folder" : "global",
    );
    return new CommandService(index);
  }, [fileCommands, folderCommands, isFolderScope, shouldComputeCommandData]);

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

    if (effectiveFolderScope) {
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
          parentFolderId !== effectiveFolderScope.folderId
          && !ancestorFolderIds.includes(effectiveFolderScope.folderId)
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
          item.entityId !== effectiveFolderScope.folderId
          && !ancestorFolderIds.includes(effectiveFolderScope.folderId)
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

    const hasFileScopes = Boolean(effectiveFolderScope || searchScope.tag || searchScope.domain);
    if (hasFileScopes && item.group !== "files" && item.group !== "folders") {
      return false;
    }

    return true;
  }, [effectiveFolderScope, recentScopedFileIds, searchScope, taggedEntityIds]);

  const searchSnapshot = useMemo(() => {
    if (!commandService) {
      return {
        exactResults: [] as EngineCommandItem[],
        durationMs: 0,
      };
    }

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

    if (!isScopeEmpty(searchScope) || effectiveFolderScope !== null) {
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
    effectiveFolderScope,
    fuzzyFolderResults,
    searchScope,
    matchesScopedFilters,
    resultLimit,
  ]);
  const exactResults = searchSnapshot.exactResults;
  const searchDurationMs = searchSnapshot.durationMs;

  const fallbackResults = useMemo(() => {
    if (!commandService) {
      return [];
    }

    const base = commandService.search("", commandContext);
    if (isScopeEmpty(searchScope) && effectiveFolderScope === null) {
      return base.slice(0, resultLimit);
    }

    return base.filter(matchesScopedFilters).slice(0, resultLimit);
  }, [commandContext, commandService, effectiveFolderScope, matchesScopedFilters, resultLimit, searchScope]);

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
  const semanticCommandByEntityId = useMemo(
    () => new Map(
      semanticCommands
        .filter((item): item is EngineCommandItem & { entityId: string } => typeof item.entityId === "string" && item.entityId.trim().length > 0)
        .map((item) => [item.entityId, item]),
    ),
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
      const semanticEntityId = typeof item.entityId === "string" ? item.entityId : "";
      pushMerged(item, item.score ?? 0, semanticHitScores.get(semanticEntityId) ?? 0, false);
    }

    for (const [semanticId, semanticScore] of semanticHitScores.entries()) {
      const item = semanticCommandByEntityId.get(semanticId);
      if (!item) {
        continue;
      }

      const existsInKeywordResults = results.some((candidate) => candidate.id === item.id);
      pushMerged(item, existsInKeywordResults ? (item.score ?? 0) : 0, semanticScore, !existsInKeywordResults);
    }

    const merged = mergeSemanticKeywordResults({
      items: mergedInputs,
      semanticWeightPercent: 60,
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
    resultLimit,
    results,
    semanticCommandByEntityId,
    semanticHitScores,
    semanticReadyForMerge,
  ]);

  const displayResults = useMemo(
    () => (scopeSelectorMode ? scopeSelectorItems : semanticMergedResults),
    [scopeSelectorItems, scopeSelectorMode, semanticMergedResults],
  );
  const displayIndexById = useMemo(() => {
    const indexById = new Map<string, number>();
    displayResults.forEach((item, index) => {
      indexById.set(item.id, index);
    });
    return indexById;
  }, [displayResults]);
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
  const hasAnyScope = useMemo(
    () => !isScopeEmpty(searchScope) || effectiveFolderScope !== null,
    [effectiveFolderScope, searchScope],
  );

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

  const handleOpenPalette = useCallback(() => {
    vibrate(8);
    setOpen(true);
  }, []);

  const handleClosePalette = useCallback(() => {
    vibrate(6);
    setOpen(false);
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
  }, [setScopeSelectorMode, setStickyPrefixMode]);
  const handleClearQuery = useCallback(() => {
    vibrate(6);
    setQuery("");
    setScopeHistoryCursor(-1);
  }, [setScopeHistoryCursor]);

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
      if (typeof route === "string" && route.length > 0) {
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

      if (item.group === "folders" && typeof item.entityId === "string" && item.entityId.trim().length > 0) {
        const folderId = item.entityId.trim();
        const payloadTrailIds = Array.isArray(item.payload?.trailIds)
          ? item.payload.trailIds
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
          : [];
        const payloadTrailLabels = Array.isArray(item.payload?.trailLabels)
          ? item.payload.trailLabels
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
          : [];
        const ancestorIds = Array.isArray(item.payload?.ancestorFolderIds)
          ? item.payload.ancestorFolderIds
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
          : [];

        const trailIds = payloadTrailIds.length > 0
          ? payloadTrailIds
          : ancestorIds;
        const trailLabels = payloadTrailLabels.length > 0
          ? payloadTrailLabels
          : [item.title];

        const fallbackRoute = buildFolderRouteHref({
          departmentId,
          semesterId,
          folderId,
          folderName: item.title,
          trailIds,
          trailLabels,
        });
        router.push(fallbackRoute);
        setOpen(false);
        return;
      }

      dispatcher.execute(item);
      setOpen(false);
    },
    [
      departmentId,
      dispatcher,
      offlineFiles,
      pushRecentCommandId,
      pushRecentQuery,
      pushScopeHistory,
      router,
      searchScope,
      semesterId,
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
      const trailIds = Array.isArray(item.payload?.trailIds)
        ? item.payload.trailIds
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
        : [folderId];
      const trailLabels = Array.isArray(item.payload?.trailLabels)
        ? item.payload.trailLabels
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
        : [label];
      const repoKind = activeRepositoryPage === "personal" ? "personal" : "global";

      setActiveNavigationScope({
        kind: "folder",
        folderId,
        folderName: label,
        repoKind,
        breadcrumb: buildBreadcrumbFromTrail(folderId, trailIds, trailLabels),
      });
      applyScope({
        ...searchScope,
        folder: null,
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
  }, [
    activeRepositoryPage,
    applyScope,
    scopeSelectorMode,
    searchScope,
    setActiveNavigationScope,
    setScopeSelectorMode,
    setStickyPrefixMode,
  ]);

  const handleItemSelect = useCallback((item: EngineCommandItem) => {
    if (handleScopeSelectorChoose(item)) {
      return;
    }

    executeCommand(item);
  }, [executeCommand, handleScopeSelectorChoose]);
  const handleCommandKeyDown = useCommandKeyboardNavigation({
    displayResults,
    groupedResults,
    query,
    scopeSelectorMode,
    stickyPrefixMode,
    scopeHistoryCursor,
    scopeHistory,
    activeIndex,
    searchScope,
    effectiveFolderScope,
    setScopeSelectorMode,
    setStickyPrefixMode,
    setScopeHistoryCursor,
    setActiveIndex,
    setQuery,
    clearStickyPrefixMode,
    removeLastScopePill,
    applyScope,
    handleItemSelect,
  });
  const resolveCrossRepoSubtitle = useCallback((hit: IntelligenceSearchHit): string => {
    const basePath = hit.fullPath ?? hit.name ?? "";
    if (!basePath) {
      return "";
    }

    if (activeNavigationScope.kind === "folder" && currentFolderPath) {
      return getRelativePath(basePath, currentFolderPath);
    }

    return basePath;
  }, [activeNavigationScope.kind, currentFolderPath]);
  const handleCrossRepoHitSelect = useCallback((hit: IntelligenceSearchHit) => {
    const fileId = (hit.fileId ?? hit.id).trim();
    if (!fileId) {
      return;
    }

    const matchedCommand = semanticCommandByEntityId.get(fileId)
      ?? displayResults.find((entry) => entry.entityId === fileId || entry.id === fileId);
    if (matchedCommand) {
      handleItemSelect(matchedCommand);
      return;
    }

    const repoKind = hit.repoKind === "personal" ? "personal" : "global";
    setActiveRepositoryPage(repoKind);

    const targetFolderId = hit.isFolder
      ? fileId
      : hit.ancestorIds?.[hit.ancestorIds.length - 1] ?? hit.customFolderId ?? "";
    if (!targetFolderId) {
      return;
    }

    const fullSegments = (hit.fullPath ?? "")
      .split(">")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const trailLabels = fullSegments.slice(0, Math.max(0, fullSegments.length - 1));
    const parentLabel = trailLabels[trailLabels.length - 1] ?? targetFolderId;
    const route = buildFolderRouteHref({
      departmentId,
      semesterId,
      folderId: targetFolderId,
      folderName: parentLabel,
      trailLabels,
      trailIds: hit.ancestorIds ?? [],
    });

    router.push(route);
    setOpen(false);
  }, [
    departmentId,
    displayResults,
    handleItemSelect,
    router,
    semanticCommandByEntityId,
    semesterId,
    setActiveRepositoryPage,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
    setRecentQueries(loadRecentQueries());
    setRecentCommandIds(loadRecentCommandIds());
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
        if (onboardingActive) {
          event.preventDefault();
          return;
        }

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

        if (!isScopeEmpty(searchScope) || effectiveFolderScope !== null) {
          vibrate(6);
          applyScope(GLOBAL_SCOPE);
          if (activeNavigationScope.kind === "folder") {
            handleResetNavigationScope(activeNavigationScope.repoKind);
          }
          return;
        }

        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeNavigationScope,
    activatePrefixMode,
    applyScope,
    clearStickyPrefixMode,
    effectiveFolderScope,
    handleResetNavigationScope,
    onboardingActive,
    open,
    query,
    scopeHistory,
    setScopeHistoryCursor,
    setScopeSelectorMode,
    setStickyPrefixMode,
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

  useEffect(() => {
    if (open) {
      return;
    }
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
  }, [open, setScopeSelectorMode, setStickyPrefixMode]);

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
  }, [pathname, setScopeHistoryCursor, setScopeSelectorMode, setStickyPrefixMode]);

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
      : intelligenceRuntimeStatus === "indexing"
        ? "Learning your library"
      : intelligenceRuntimeStatus === "ready"
        ? semanticQueryPending
          ? "Searching"
          : semanticQueryTimedOut
            ? "Partial results"
            : semanticQueryError
              ? "Keyword fallback"
                : "Smart search active"
        : intelligenceRuntimeStatus === "error"
          ? "Unavailable"
        : ""
    : "";
  const isMobilePalette = isCoarsePointer || (viewportMetrics.width > 0 && viewportMetrics.width <= 820);
  const panelHeight = Math.min(
    isMobilePalette ? 920 : 880,
    Math.max(isMobilePalette ? 420 : 360, (viewportMetrics.height || 760) - (isMobilePalette ? 8 : 24)),
  );
  const isCompactScopeChip = (viewportMetrics.width || 390) < 375;
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
      return activeRepositoryPage === "personal"
        ? "Department scope is unavailable in Personal Repository"
        : "Choose a department/semester scope...";
    }
    if (stickyPrefixMode === "actions") {
      return "Search actions...";
    }
    if (stickyPrefixMode === "recents") {
      return "Search recent items...";
    }
    return scopedPlaceholder;
  }, [activeRepositoryPage, scopedPlaceholder, stickyPrefixMode]);

  const activeScopeLabel = useMemo(() => {
    if (activeNavigationScope.kind === "folder") {
      return activeNavigationScope.folderName;
    }
    if (activeNavigationScope.kind === "personal-root") {
      return "Personal Repository";
    }

    if (scopePills.length === 0) {
      return REPOSITORY_SCOPE_LABEL[activeRepositoryPage];
    }
    return scopePills.map((pill) => pill.label).join(" + ");
  }, [activeNavigationScope, activeRepositoryPage, scopePills]);
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
  const headerTitle = scopeSelectorMode
    ? scopeSelectorMode === "folders"
      ? "Select Folder Scope"
      : scopeSelectorMode === "tags"
        ? "Select Tag Scope"
        : "Select Department Scope"
    : hasAnyScope
      ? "Scoped Search"
      : "Command Center";
  const headerResultText = scopeSelectorMode
    ? `${displayResults.length} option${displayResults.length === 1 ? "" : "s"}`
    : `${displayResults.length} result${displayResults.length === 1 ? "" : "s"}`;
  const headerLatencyText = showLoadingSkeleton
    ? "Preparing"
    : `${searchDurationMs < 10 ? searchDurationMs.toFixed(2) : searchDurationMs.toFixed(1)} ms`;
  const headerContextText = showLoadingSkeleton
    ? "Preparing"
    : scopeSelectorMode
      ? "Scope selection"
      : hasAnyScope
        ? activeScopeLabel
        : REPOSITORY_SCOPE_LABEL[activeRepositoryPage];

  useEffect(() => {
    writeScopeSummary(activeScopeLabel);
  }, [activeScopeLabel]);

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

    if (activeRepositoryPage === "personal") {
      parsedScope.domain = null;
    }

    if (parsedScope.folder) {
      const nextRepoKind = activeRepositoryPage === "personal" ? "personal" : "global";
      const matchedOption = folderScopeOptions.find(
        (option) => option.folderId === parsedScope.folder?.folderId,
      );
      const fallbackTrailIds = matchedOption?.trailIds ?? [parsedScope.folder.folderId];
      const fallbackTrailLabels = matchedOption?.trailLabels ?? [parsedScope.folder.label];

      setActiveNavigationScope({
        kind: "folder",
        folderId: parsedScope.folder.folderId,
        folderName: parsedScope.folder.label,
        repoKind: nextRepoKind,
        breadcrumb: buildBreadcrumbFromTrail(
          parsedScope.folder.folderId,
          fallbackTrailIds,
          fallbackTrailLabels,
        ),
      });
    }
    parsedScope.folder = null;

    applyScope(parsedScope);
    setQuery(queryFromUrl);
    setScopeSelectorMode(null);
    setStickyPrefixMode(null);
    setOpen(true);
  }, [
    activeRepositoryPage,
    applyScope,
    folderScopeOptions,
    searchParams,
    setActiveNavigationScope,
    setScopeSelectorMode,
    setStickyPrefixMode,
    tags,
  ]);

  return (
    <>
      <FloatingDock 
        isPaletteOpen={open}
        onOpenPalette={handleOpenPalette}
        placeholder={scopedPlaceholder || placeholder}
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
              <div className="mb-1.5 rounded-lg border border-border/65 bg-muted/20 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[11px] font-semibold tracking-[0.01em] text-foreground">{headerTitle}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {headerContextText}
                      <span aria-hidden="true" className="px-1 text-muted-foreground/60">·</span>
                      {headerResultText}
                      <span aria-hidden="true" className="px-1 text-muted-foreground/60">·</span>
                      {headerLatencyText}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="size-7 shrink-0 rounded-md"
                    onClick={handleClosePalette}
                  >
                    <IconX className="size-3.5" />
                    <span className="sr-only">Close command palette</span>
                  </Button>
                </div>
              </div>

                <Command
                  shouldFilter={false}
                  className="flex min-h-0 flex-1 rounded-xl border border-border/80 bg-card p-1.5 shadow-inner"
                  onKeyDown={handleCommandKeyDown}
                >
                <CommandInputSection
                  spring={motionTokens.spring}
                  effectiveVisualQuery={effectiveVisualQuery}
                  inputCenterOffset={inputCenterOffset}
                  scopePills={scopePills}
                  stickyModeDescriptor={stickyModeDescriptor}
                  stickyPrefixMode={stickyPrefixMode}
                  query={query}
                  commandInputPlaceholder={commandInputPlaceholder}
                  placeholderContainerRef={placeholderContainerRef}
                  placeholderMeasureRef={placeholderMeasureRef}
                  onQueryChange={handleQueryChange}
                  onClearQuery={handleClearQuery}
                  activeNavigationScope={activeNavigationScope}
                  isCompactScopeChip={isCompactScopeChip}
                  onResetNavigationScope={handleResetNavigationScope}
                  onCollapseNavigationScope={handleCollapseNavigationScope}
                />

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
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
                  className="flex min-h-0 flex-1 overflow-hidden"
                >
                  <CommandResultsList
                    listRef={listRef}
                    activeItemRef={activeItemRef}
                    listBottomInset={listBottomInset}
                    showLoadingSkeleton={showLoadingSkeleton}
                    showingFallbackResults={showingFallbackResults}
                    scopeSelectorMode={scopeSelectorMode}
                    effectiveVisualQuery={effectiveVisualQuery}
                    hasAnyScope={hasAnyScope}
                    activeScopeLabel={activeScopeLabel}
                    activeNavigationScope={activeNavigationScope}
                    onExpandToGlobal={() => {
                      applyScope(GLOBAL_SCOPE);
                      if (activeNavigationScope.kind === "folder") {
                        handleResetNavigationScope(activeNavigationScope.repoKind);
                      }
                    }}
                    crossRepoAbovePrimary={crossRepoAbovePrimary}
                    crossRepoSemanticHits={crossRepoSemanticHits}
                    onCrossRepoHitSelect={handleCrossRepoHitSelect}
                    resolveCrossRepoSubtitle={resolveCrossRepoSubtitle}
                    groupedResults={groupedResults}
                    activeIndex={activeIndex}
                    onSetActiveIndex={setActiveIndex}
                    onItemSelect={handleItemSelect}
                    semanticEnterOrder={semanticEnterOrder}
                    motionScale={motionTokens.scale}
                    isMobilePalette={isMobilePalette}
                    offlineFiles={offlineFiles}
                    debugCommandScoring={debugCommandScoring}
                    displayIndexById={displayIndexById}
                  />
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
