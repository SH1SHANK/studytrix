"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import {
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconFilter,
  IconLayoutGrid,
  IconList,
  IconSettings,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FolderCard } from "@/components/folder/FolderCard";
import { ListRow } from "@/components/folder/ListRow";
import { useAcademicContext } from "@/components/layout/AcademicContext";
import { useCatalog } from "@/features/catalog/catalog.hooks";
import { useCatalogIndex } from "@/features/catalog/catalog.index";
import { getDailyQuote } from "@/features/dashboard/quotes";
import { type Course } from "@/features/catalog/catalog.types";
import { useTagStore } from "@/features/tags/tag.store";
import type { FilterMode, TagAssignment } from "@/features/tags/tag.types";
import { getDepartmentName } from "@/lib/academic";
import { DOWNLOAD_BUTTON_ELEMENT_ID, useDownloadManager } from "@/ui/hooks/useDownloadManager";
import { useSetting } from "@/ui/hooks/useSettings";
import { SettingsMenu } from "@/components/settings/SettingsMenu";

// ─── Constants ──────────────────────────────────────────────────────────────

type FolderColor = "indigo" | "emerald" | "amber" | "sky" | "rose" | "stone";
type SortKey = "recent" | "name" | "credits";

const FOLDER_COLORS: FolderColor[] = [
  "indigo",
  "emerald",
  "amber",
  "sky",
  "rose",
  "stone",
];


const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recent",
  name: "Name",
  credits: "Credits",
};

const FALLBACK_QUOTE = "The only way to do great work is to love what you do.";
const REAL_FOLDER_PATTERN = /^[a-zA-Z0-9_-]{10,}$/;


// ─── Helpers ────────────────────────────────────────────────────────────────

type DashboardFolder = {
  id: string;
  routeId: string;
  legacyId: string;
  title: string;
  meta: string;
  credits: number;
  courseType: string;
  variant: "default" | "accent";
  color: FolderColor;
  tagIds: string[];
  starred: boolean;
};

function getColorFromCourseCode(courseCode: string): FolderColor {
  const hash = Array.from(courseCode).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );
  return FOLDER_COLORS[hash % FOLDER_COLORS.length] ?? "stone";
}

function getCourseMeta(course: Course): string {
  const meta: string[] = [];
  meta.push(`${course.credits} credits`);
  if (course.courseType === "lab") meta.push("Lab");
  if (course.courseType === "elective") meta.push("Elective");
  if (course.courseType === "core") meta.push("Core");
  return meta.slice(0, 2).join(" · ") || "Course folder";
}

function resolveAssignment(
  assignments: Record<string, TagAssignment>,
  routeId: string,
  legacyId: string,
): { tagIds: string[]; starred: boolean } {
  const routeAssignment = assignments[routeId];
  const legacyAssignment = assignments[legacyId];
  const combinedTagIds = Array.from(
    new Set([...(routeAssignment?.tagIds ?? []), ...(legacyAssignment?.tagIds ?? [])]),
  );
  return {
    tagIds: combinedTagIds,
    starred: Boolean(routeAssignment?.starred || legacyAssignment?.starred),
  };
}

function matchesFilters(
  folder: DashboardFolder,
  activeFilters: readonly string[],
  filterMode: FilterMode,
): boolean {
  if (activeFilters.length === 0) return true;
  const folderTagSet = new Set(folder.tagIds);
  if (filterMode === "AND") {
    return activeFilters.every((tagId) => folderTagSet.has(tagId));
  }
  return activeFilters.some((tagId) => folderTagSet.has(tagId));
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning ☀️";
  if (hour < 17) return "Good afternoon 🌤️";
  return "Good evening 🌙";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DashboardGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrationRef = useRef(false);
  const { department, setDepartment, semester, setSemester } =
    useAcademicContext();
  const { courses, isLoading, error } = useCatalog(department, semester);
  const { departments: availableDepts, isLoading: indexLoading } = useCatalogIndex();
  const {
    tags,
    assignments,
    activeFilters,
    filterMode,
    toggleFilter,
    clearFilters,
    setFilterMode,
    isHydrated,
    hydrate,
  } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
      assignments: state.assignments,
      activeFilters: state.activeFilters,
      filterMode: state.filterMode,
      toggleFilter: state.toggleFilter,
      clearFilters: state.clearFilters,
      setFilterMode: state.setFilterMode,
      isHydrated: state.isHydrated,
      hydrate: state.hydrate,
    })),
  );

  const [defaultSortValue] = useSetting("default_sort_order");
  const [showQuoteValue] = useSetting("show_dashboard_quote");
  const [defaultDashboardView] = useSetting("dashboard_default_view");
  const [showDashboardTags] = useSetting("show_dashboard_tags");

  const [viewMode, setViewMode] = useState<"grid" | "list">((defaultDashboardView as "grid" | "list") || "grid");
  const [sortKey, setSortKey] = useState<SortKey>((defaultSortValue as SortKey) || "recent");
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  // Local state for the dashboard quote
  const [quote, setQuote] = useState<string | null>(null);
  const [quoteAuthor, setQuoteAuthor] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  // Sync viewMode if the setting changes externally
  useEffect(() => {
    if (defaultDashboardView) {
      setViewMode(defaultDashboardView as "grid" | "list");
    }
  }, [defaultDashboardView]);

  // Sync sortKey if the setting changes externally
  useEffect(() => {
    if (defaultSortValue) {
      setSortKey(defaultSortValue as SortKey);
    }
  }, [defaultSortValue]);

  const availableSemesters = useMemo(() => {
    const entry = availableDepts.find((d) => d.id === department);
    return entry?.availableSemesters ?? [];
  }, [availableDepts, department]);

  const departmentLabel = getDepartmentName(department);
  const { activeCount, openDrawer } = useDownloadManager();

  // Hydrate tags
  useEffect(() => {
    if (isHydrated || hydrationRef.current) return;
    hydrationRef.current = true;
    void hydrate();
  }, [hydrate, isHydrated]);

  // Sync dashboard context from URL so breadcrumb taps can restore location.
  useEffect(() => {
    const requestedDepartment = searchParams.get("department")?.trim().toUpperCase() ?? "";
    const requestedSemester = Number.parseInt(searchParams.get("semester") ?? "", 10);

    if (
      requestedDepartment &&
      requestedDepartment !== department &&
      availableDepts.some((dept) => dept.id === requestedDepartment)
    ) {
      setDepartment(requestedDepartment);
    }

    if (
      Number.isInteger(requestedSemester) &&
      requestedSemester >= 1 &&
      requestedSemester <= 8 &&
      requestedSemester !== semester
    ) {
      setSemester(requestedSemester);
    }
  }, [
    availableDepts,
    department,
    searchParams,
    semester,
    setDepartment,
    setSemester,
  ]);

  // Set today's local quote
  useEffect(() => {
    const q = getDailyQuote();
    setQuote(q.text);
    setQuoteAuthor(q.author);
    setQuoteLoading(false);
  }, []);

  // ─── Derived data ───────────────────────────────────────────────────────


  const folders = useMemo<DashboardFolder[]>(
    () =>
      courses
        .filter((course) => REAL_FOLDER_PATTERN.test(course.driveFolderId))
        .map((course) => {
        const routeId = course.driveFolderId;
        const legacyId = course.courseCode;
        const assignmentState = resolveAssignment(assignments, routeId, legacyId);
        return {
          id: routeId || legacyId,
          routeId: routeId || legacyId,
          legacyId,
          title: course.courseName,
          meta: getCourseMeta(course),
          credits: course.credits,
          courseType: course.courseType,
          variant: (course.courseType !== "core" ? "accent" : "default") as
            | "default"
            | "accent",
          color: getColorFromCourseCode(course.courseCode),
          tagIds: assignmentState.tagIds,
          starred: assignmentState.starred,
        };
      }),
    [assignments, courses],
  );

  const filteredFolders = useMemo(() => {
    const filtered = folders.filter((folder) =>
      matchesFilters(folder, activeFilters, filterMode),
    );

    return [...filtered].sort((left, right) => {
      // Starred always first
      if (left.starred !== right.starred) {
        return left.starred ? -1 : 1;
      }

      switch (sortKey) {
        case "name":
          return left.title.localeCompare(right.title);
        case "credits":
          return right.credits - left.credits;
        case "recent":
        default:
          return left.title.localeCompare(right.title);
      }
    });
  }, [activeFilters, filterMode, folders, sortKey]);

  const coreFolders = useMemo(
    () => filteredFolders.filter((f) => f.courseType === "core"),
    [filteredFolders],
  );

  const electiveFolders = useMemo(
    () => filteredFolders.filter((f) => f.courseType !== "core"),
    [filteredFolders],
  );

  const tagOptions = useMemo(() => {
    const countByTag = new Map<string, number>();
    for (const folder of folders) {
      for (const tagId of new Set(folder.tagIds)) {
        countByTag.set(tagId, (countByTag.get(tagId) ?? 0) + 1);
      }
    }

    const tagById = new Map(tags.map((tag) => [tag.id, tag]));
    const visibleTagIds = new Set<string>(countByTag.keys());
    for (const tagId of activeFilters) {
      visibleTagIds.add(tagId);
    }

    return [...visibleTagIds]
      .map((tagId) => {
        const tag = tagById.get(tagId);
        if (!tag) return null;
        return {
          id: tag.id,
          label: tag.name,
          color: tag.color,
          uses: tag.uses,
          count: countByTag.get(tag.id) ?? 0,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((left, right) => {
        const leftActive = activeFilters.includes(left.id);
        const rightActive = activeFilters.includes(right.id);
        if (leftActive !== rightActive) return leftActive ? -1 : 1;
        if (left.count !== right.count) return right.count - left.count;
        return left.label.localeCompare(right.label);
      });
  }, [activeFilters, folders, tags]);

  const activeSet = useMemo(() => new Set(activeFilters), [activeFilters]);
  const hasActiveFilters = activeFilters.length > 0;

  const handleOpenFolder = useCallback(
    (driveFolderId: string, courseName: string) => {
      router.push(
        `/${encodeURIComponent(department)}/${encodeURIComponent(String(semester))}/${encodeURIComponent(driveFolderId)}?name=${encodeURIComponent(courseName)}`,
      );
    },
    [department, semester, router],
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <section className="flex flex-col gap-0 px-4 pb-32 pt-5 sm:pt-6">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {/* Branch Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-10 min-w-0 shrink gap-1 rounded-lg px-2 text-base font-semibold tracking-tight text-foreground transition-all hover:bg-muted/60 active:scale-[0.98] sm:text-lg"
                />
              }
            >
              <span className="min-w-0 truncate">{departmentLabel}</span>
              <IconChevronDown className="size-3.5 shrink-0 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {indexLoading ? (
                <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
              ) : (
                availableDepts.map((dept) => (
                  <DropdownMenuItem key={dept.id} onClick={() => setDepartment(dept.id)}>
                    {dept.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-muted-foreground/80">·</span>

          {/* Semester Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-10 min-w-0 shrink gap-1 rounded-lg px-2 text-base font-semibold tracking-tight text-foreground transition-all hover:bg-muted/60 active:scale-[0.98] sm:text-lg"
                />
              }
            >
              <span className="min-w-0 truncate">{`Semester ${semester}`}</span>
              <IconChevronDown className="size-3.5 shrink-0 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {availableSemesters.length > 0 ? (
                availableSemesters.map((value) => (
                  <DropdownMenuItem key={value} onClick={() => setSemester(value)}>
                    {`Semester ${value}`}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No semesters</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Icon-only buttons */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            id={DOWNLOAD_BUTTON_ELEMENT_ID}
            variant="ghost"
            size="icon"
            className="relative size-10 rounded-lg transition-all hover:bg-muted/60 active:scale-[0.97]"
            aria-label="Downloads"
            onClick={openDrawer}
          >
            <IconDownload className="size-[18px] text-muted-foreground" />
            {activeCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </Button>
          <SettingsMenu />
        </div>
      </div>

      {/* ── Greeting Strip ──────────────────────────────────── */}
      <div className="mt-4">
        <h2 className="text-xl font-medium text-foreground sm:text-2xl">
          {getGreeting()}, there
        </h2>
        {showQuoteValue !== false && (
          <div className="mt-1 min-h-[20px]">
            {quoteLoading ? (
              <Skeleton className="h-4 w-3/4 rounded" />
            ) : (
              <div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{quote ?? FALLBACK_QUOTE}&rdquo;
                </p>
                {quoteAuthor ? (
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground/80">
                    — {quoteAuthor}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Toolbar Row ─────────────────────────────────────── */}
      <div className="mt-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium text-muted-foreground shadow-sm"
                />
              }
            >
              Sort: {SORT_LABELS[sortKey]}
              <IconChevronDown className="size-3.5 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <DropdownMenuItem key={key} onClick={() => setSortKey(key)}>
                  {SORT_LABELS[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filter Dropdown (tag selector + Any/All inside) */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium shadow-sm",
                    hasActiveFilters
                      ? "border-primary/50 text-primary"
                      : "text-muted-foreground",
                  )}
                />
              }
            >
              <IconFilter className="size-3.5" />
              Filter
              {hasActiveFilters ? (
                <Badge className="ml-0.5 h-4 rounded-full px-1.5 text-[9px]">
                  {activeFilters.length}
                </Badge>
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2">
              {/* Any/All toggle */}
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-muted-foreground">Match mode</span>
                <ToggleGroup
                  type="single"
                  value={[filterMode]}
                  onValueChange={(value: string[]) => {
                    const next = value[0];
                    if (next === "AND" || next === "OR") {
                      setFilterMode(next);
                    }
                  }}
                  variant="outline"
                  spacing={1}
                >
                  <ToggleGroupItem
                    value="OR"
                    aria-label="Match any"
                    className="h-6 px-2 text-[10px]"
                  >
                    Any
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="AND"
                    aria-label="Match all"
                    className="h-6 px-2 text-[10px]"
                  >
                    All
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {tagOptions.length > 0 ? (
                <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                  {tagOptions.map((option) => {
                    const isActive = activeSet.has(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleFilter(option.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                        <span className="flex-1 truncate">{option.label}</span>
                        <span className="text-[10px] text-muted-foreground/80">{option.count}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="px-1 py-2 text-center text-xs text-muted-foreground/80">
                  No tags available
                </p>
              )}

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-1.5 w-full rounded-md py-1 text-center text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Clear all filters
                </button>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* View Toggle */}
        <ToggleGroup
          type="single"
          value={[viewMode]}
          onValueChange={(value: string[]) => {
            const next = value[0];
            if (next === "grid" || next === "list") {
              setViewMode(next);
            }
          }}
          variant="outline"
          spacing={1}
        >
          <ToggleGroupItem
            value="grid"
            aria-label="Grid view"
            className="h-9 min-w-9 rounded-lg border-border shadow-sm data-pressed:bg-primary data-pressed:text-primary-foreground"
          >
            <IconLayoutGrid className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label="List view"
            className="h-9 min-w-9 rounded-lg border-border shadow-sm data-pressed:bg-primary data-pressed:text-primary-foreground"
          >
            <IconList className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* ── Browse by Tag Row ──────────────────────────────── */}
      {showDashboardTags !== false && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80">
              Browse by Tag
            </h3>
            <button
              type="button"
              onClick={() => router.push("/tags")}
              className="flex items-center gap-0.5 text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
            >
              Manage Tags
              <IconChevronRight className="size-3" />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {tagOptions.length > 0 ? (
              tagOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => router.push(`/tags/${option.id}`)}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:shadow-sm active:scale-[0.97]"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  {option.label}
                  <IconChevronRight className="size-3 text-muted-foreground/80" />
                </button>
              ))
            ) : (
              <p className="py-1 text-xs text-muted-foreground/80">
                No tags yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Course Sections ──────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-8">
        {isLoading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={`sk-${index}`} className="h-[120px] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={`sk-${index}`} className="h-16 rounded-xl" />
              ))}
            </div>
          )
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : folders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No courses found for {departmentLabel} Semester {semester}.
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No folders match the current filters.
          </div>
        ) : (
          <>
            {/* Core Courses */}
            {coreFolders.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
                    Core Courses
                  </h3>
                  <span className="flex h-5 items-center justify-center rounded-full bg-muted px-2 text-[10px] font-semibold text-muted-foreground">
                    {coreFolders.length}
                  </span>
                </div>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-4">
                    {coreFolders.map((folder, index) => (
                      <div key={folder.id} className="card-entrance" style={{ animationDelay: `${index * 50}ms` }}>
                      <FolderCard
                        entityId={folder.id}
                        title={folder.title}
                        meta={folder.meta}
                        variant={folder.variant}
                        color={folder.color}
                        onOpen={() => handleOpenFolder(folder.routeId, folder.title)}
                      />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {coreFolders.map((folder) => (
                      <ListRow
                        key={folder.id}
                        id={folder.id}
                        title={folder.title}
                        meta={folder.meta}
                        variant={folder.variant}
                        isOpen={openRowId === folder.id}
                        onSwipeOpen={setOpenRowId}
                        onOpen={() => handleOpenFolder(folder.routeId, folder.title)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Elective / Lab Courses */}
            {electiveFolders.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
                    Elective &amp; Lab
                  </h3>
                  <span className="flex h-5 items-center justify-center rounded-full bg-primary/15 px-2 text-[10px] font-semibold text-primary">
                    {electiveFolders.length}
                  </span>
                </div>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-4">
                    {electiveFolders.map((folder, index) => (
                      <div key={folder.id} className="card-entrance" style={{ animationDelay: `${(coreFolders.length + index) * 50}ms` }}>
                      <FolderCard
                        entityId={folder.id}
                        title={folder.title}
                        meta={folder.meta}
                        variant={folder.variant}
                        color={folder.color}
                        onOpen={() => handleOpenFolder(folder.routeId, folder.title)}
                      />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {electiveFolders.map((folder) => (
                      <ListRow
                        key={folder.id}
                        id={folder.id}
                        title={folder.title}
                        meta={folder.meta}
                        variant={folder.variant}
                        isOpen={openRowId === folder.id}
                        onSwipeOpen={setOpenRowId}
                        onOpen={() => handleOpenFolder(folder.routeId, folder.title)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
