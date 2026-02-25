"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import {
  IconChevronDown,
  IconDownload,
  IconFilter,
  IconLayoutGrid,
  IconList,
} from "@tabler/icons-react";

import { useAcademicContext } from "@/components/layout/AcademicContext";
import { SettingsMenu } from "@/features/settings/ui/SettingsMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RepositoryPage } from "@/features/custom-folders/custom-folders.tabs.store";
import { useCatalogIndex } from "@/features/catalog/catalog.index";
import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";
import { DashboardTabBar } from "@/features/dashboard/ui/DashboardTabBar";
import {
  type DashboardToolbarSortKey,
  useDashboardToolbarStore,
} from "@/features/dashboard/dashboard.toolbar.store";
import { generateGreetingMessage } from "@/features/dashboard/greeting";
import { resolveGreetingPreferences } from "@/features/dashboard/greeting.preferences";
import { resolveUserProfileSettings } from "@/features/profile/user-profile";
import { useTagStore } from "@/features/tags/tag.store";
import { getDepartmentName } from "@/lib/academic";
import { cn } from "@/lib/utils";
import { DOWNLOAD_BUTTON_ELEMENT_ID, useDownloadManager } from "@/ui/hooks/useDownloadManager";
import { useSetting } from "@/ui/hooks/useSettings";

type DashboardSharedChromeProps = {
  activePage: RepositoryPage;
  onPageChange: (page: RepositoryPage) => void;
  showPersonalRepository: boolean;
};

const SORT_OPTIONS: DashboardToolbarSortKey[] = ["recent", "name", "metric"];

const SORT_LABELS_BY_PAGE: Record<RepositoryPage, Record<DashboardToolbarSortKey, string>> = {
  global: {
    recent: "Recent",
    name: "Name",
    metric: "Credits",
  },
  personal: {
    recent: "Recent",
    name: "Name",
    metric: "Items",
  },
};

export function DashboardSharedChrome({
  activePage,
  onPageChange,
  showPersonalRepository,
}: DashboardSharedChromeProps) {
  const searchParams = useSearchParams();
  const { department, setDepartment, semester, setSemester } = useAcademicContext();
  const { departments: availableDepts, isLoading: indexLoading } = useCatalogIndex();
  const departmentLabel = getDepartmentName(department);
  const [showDashboardTags] = useSetting("show_dashboard_tags");
  const [defaultTagFilterMode] = useSetting("tag_filter_mode_default");
  const [rawGreetingPreferences] = useSetting("greetingPreferences");
  const [rawUserProfile] = useSetting("userProfile");
  const greetingPreferences = useMemo(
    () => resolveGreetingPreferences(rawGreetingPreferences),
    [rawGreetingPreferences],
  );
  const userProfile = useMemo(
    () => resolveUserProfileSettings(rawUserProfile),
    [rawUserProfile],
  );

  const sortKey = useDashboardToolbarStore((state) => state.sortKey);
  const setSortKey = useDashboardToolbarStore((state) => state.setSortKey);
  const viewMode = useDashboardToolbarStore((state) => state.viewMode);
  const setViewMode = useDashboardToolbarStore((state) => state.setViewMode);
  const personalFilterMode = useDashboardToolbarStore((state) => state.personalFilterMode);
  const setPersonalFilterMode = useDashboardToolbarStore((state) => state.setPersonalFilterMode);

  const {
    tags,
    assignments,
    activeFilters,
    filterMode,
    toggleFilter,
    clearFilters,
    setFilterMode,
  } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
      assignments: state.assignments,
      activeFilters: state.activeFilters,
      filterMode: state.filterMode,
      toggleFilter: state.toggleFilter,
      clearFilters: state.clearFilters,
      setFilterMode: state.setFilterMode,
    })),
  );
  const personalFolders = useCustomFoldersStore((state) => state.folders);

  const [greetingState, setGreetingState] = useState<{
    primaryMessage: string;
    secondaryMessage: string;
  } | null>(null);
  const [greetingLoading, setGreetingLoading] = useState(false);
  const { activeCount, openDrawer } = useDownloadManager();
  const appliedTagFilterModeRef = useRef<"AND" | "OR" | null>(null);

  const availableSemesters = useMemo(() => {
    const entry = availableDepts.find((d) => d.id === department);
    return entry?.availableSemesters ?? [];
  }, [availableDepts, department]);

  useEffect(() => {
    const queryDepartment = searchParams.get("department")?.trim().toUpperCase() ?? "";
    const querySemester = Number.parseInt(searchParams.get("semester") ?? "", 10);

    if (
      queryDepartment &&
      queryDepartment !== department &&
      availableDepts.some((dept) => dept.id === queryDepartment)
    ) {
      setDepartment(queryDepartment);
    }

    if (
      Number.isInteger(querySemester) &&
      querySemester >= 1 &&
      querySemester <= 8 &&
      querySemester !== semester
    ) {
      setSemester(querySemester);
    }
  }, [availableDepts, department, searchParams, semester, setDepartment, setSemester]);

  useEffect(() => {
    const nextMode = defaultTagFilterMode === "AND" ? "AND" : "OR";
    if (appliedTagFilterModeRef.current === nextMode) {
      return;
    }
    setFilterMode(nextMode);
    appliedTagFilterModeRef.current = nextMode;
  }, [defaultTagFilterMode, setFilterMode]);

  useEffect(() => {
    if (!greetingPreferences.enabled) {
      setGreetingState(null);
      setGreetingLoading(false);
      return;
    }

    let cancelled = false;
    setGreetingLoading(true);

    const trimmedName = userProfile.name.trim();
    const resolvedUserName = greetingPreferences.useName
      ? (trimmedName.length > 0 ? trimmedName : "there")
      : "there";

    void generateGreetingMessage(
      resolvedUserName,
      greetingPreferences.includeWeather,
      greetingPreferences.greetingTheme,
    )
      .then((message) => {
        if (!cancelled) {
          setGreetingState(message);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGreetingState({
            primaryMessage:
              resolvedUserName === "there"
                ? "Good day! 👋"
                : `Good day, ${resolvedUserName}! 👋`,
            secondaryMessage: "",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGreetingLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    greetingPreferences.enabled,
    greetingPreferences.greetingTheme,
    greetingPreferences.includeWeather,
    greetingPreferences.useName,
    userProfile.name,
  ]);

  const globalTagOptions = useMemo(() => {
    const countByTag = new Map<string, number>();
    for (const assignment of Object.values(assignments)) {
      for (const tagId of assignment.tagIds ?? []) {
        countByTag.set(tagId, (countByTag.get(tagId) ?? 0) + 1);
      }
    }

    const visibleIds = new Set<string>(activeFilters);
    for (const tag of tags) {
      if ((countByTag.get(tag.id) ?? 0) > 0) {
        visibleIds.add(tag.id);
      }
    }

    return [...visibleIds]
      .map((id) => {
        const tag = tags.find((item) => item.id === id);
        if (!tag) return null;
        return {
          id,
          label: tag.name,
          color: tag.color,
          count: countByTag.get(id) ?? 0,
          active: activeFilters.includes(id),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => {
        if (left.active !== right.active) {
          return left.active ? -1 : 1;
        }
        if (left.count !== right.count) {
          return right.count - left.count;
        }
        return left.label.localeCompare(right.label);
      });
  }, [activeFilters, assignments, tags]);

  const personalFolderIds = useMemo(() => new Set(personalFolders.map((folder) => folder.id)), [personalFolders]);

  const personalTagOptions = useMemo(() => {
    const countByTag = new Map<string, number>();
    for (const [entityId, assignment] of Object.entries(assignments)) {
      if (!personalFolderIds.has(entityId)) {
        continue;
      }
      for (const tagId of assignment.tagIds ?? []) {
        countByTag.set(tagId, (countByTag.get(tagId) ?? 0) + 1);
      }
    }

    const visibleIds = new Set<string>(activeFilters);
    for (const tag of tags) {
      if ((countByTag.get(tag.id) ?? 0) > 0) {
        visibleIds.add(tag.id);
      }
    }

    return [...visibleIds]
      .map((id) => {
        const tag = tags.find((item) => item.id === id);
        if (!tag) return null;
        return {
          id,
          label: tag.name,
          color: tag.color,
          count: countByTag.get(id) ?? 0,
          active: activeFilters.includes(id),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((left, right) => {
        if (left.active !== right.active) {
          return left.active ? -1 : 1;
        }
        if (left.count !== right.count) {
          return right.count - left.count;
        }
        return left.label.localeCompare(right.label);
      });
  }, [activeFilters, assignments, personalFolderIds, tags]);

  const tagOptions = activePage === "personal" ? personalTagOptions : globalTagOptions;

  const hasGlobalFilters = activeFilters.length > 0;
  const hasPersonalFilters = personalFilterMode !== "all" || activeFilters.length > 0;
  const hasActiveFilters = activePage === "global" ? hasGlobalFilters : hasPersonalFilters;
  const metricLabel = SORT_LABELS_BY_PAGE[activePage][sortKey];

  return (
    <section className="px-4 pb-3 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
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

      {greetingPreferences.enabled ? (
        <div className="mt-4">
          {greetingLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-2/3 rounded-md sm:h-8" />
              <Skeleton className="h-4 w-5/6 rounded" />
            </div>
          ) : (
            <>
              <h2 className="text-xl font-medium text-foreground sm:text-2xl">
                {greetingState?.primaryMessage ?? "Good day! 👋"}
              </h2>
              {greetingState?.secondaryMessage.trim() ? (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {greetingState.secondaryMessage}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {showPersonalRepository ? (
        <div className="mt-4">
          <DashboardTabBar
            activePage={activePage}
            onChange={onPageChange}
            showPersonalRepository={showPersonalRepository}
          />
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
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
              Sort: {metricLabel}
              <IconChevronDown className="size-3.5 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {SORT_OPTIONS.map((key) => (
                <DropdownMenuItem key={key} onClick={() => setSortKey(key)}>
                  {key === "metric" ? SORT_LABELS_BY_PAGE[activePage][key] : SORT_LABELS_BY_PAGE.global[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium shadow-sm",
                    hasActiveFilters ? "border-primary/50 text-primary" : "text-muted-foreground",
                  )}
                />
              }
            >
              <IconFilter className="size-3.5" />
              Filter
              {hasActiveFilters ? (
                <Badge className="ml-0.5 h-4 rounded-full px-1.5 text-[9px]">
                  {activePage === "global"
                    ? activeFilters.length
                    : activeFilters.length + (personalFilterMode === "all" ? 0 : 1)}
                </Badge>
              ) : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className={activePage === "global" ? "w-56 p-2" : "w-56 p-2"}
            >
              {activePage === "global" ? (
                <>
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
                      <ToggleGroupItem value="OR" aria-label="Match any" className="h-6 px-2 text-[10px]">
                        Any
                      </ToggleGroupItem>
                      <ToggleGroupItem value="AND" aria-label="Match all" className="h-6 px-2 text-[10px]">
                        All
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {tagOptions.length > 0 ? (
                    <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
                      {tagOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleFilter(option.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            option.active
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
                      ))}
                    </div>
                  ) : (
                    <p className="px-1 py-2 text-center text-xs text-muted-foreground/80">
                      No tags available
                    </p>
                  )}

                  {hasGlobalFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-1.5 w-full rounded-md py-1 text-center text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Clear all filters
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/85">
                    Folder state
                  </div>
                  <DropdownMenuItem onClick={() => setPersonalFilterMode("all")}>
                    All folders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPersonalFilterMode("pinned")}>
                    Pinned only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPersonalFilterMode("unpinned")}>
                    Unpinned only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPersonalFilterMode("starred")}>
                    Starred only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPersonalFilterMode("unstarred")}>
                    Unstarred only
                  </DropdownMenuItem>

                  <div className="my-1 h-px bg-border/70" />
                  <div className="mb-2 flex items-center justify-between px-2">
                    <span className="text-[11px] font-medium text-muted-foreground">Tag match</span>
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
                      <ToggleGroupItem value="OR" aria-label="Match any" className="h-6 px-2 text-[10px]">
                        Any
                      </ToggleGroupItem>
                      <ToggleGroupItem value="AND" aria-label="Match all" className="h-6 px-2 text-[10px]">
                        All
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {tagOptions.length > 0 ? (
                    <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto px-1 pb-1">
                      {tagOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleFilter(option.id)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            option.active
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
                      ))}
                    </div>
                  ) : (
                    <p className="px-2 py-2 text-center text-xs text-muted-foreground/80">
                      No tags available
                    </p>
                  )}

                  {hasPersonalFilters ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPersonalFilterMode("all");
                        clearFilters();
                      }}
                      className="mt-1 w-full rounded-md py-1 text-center text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Clear personal filters
                    </button>
                  ) : null}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

      {showDashboardTags !== false ? (
        <div className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {tagOptions.length > 0 ? (
              tagOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleFilter(option.id)}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium transition-all duration-150 hover:bg-muted hover:shadow-sm active:scale-[0.97]",
                    option.active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                  {option.label}
                </button>
              ))
            ) : (
              <p className="py-1 text-xs text-muted-foreground/80">No tags yet</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
