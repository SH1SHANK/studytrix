"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { IconSearch, IconX } from "@tabler/icons-react";

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
} from "@/components/ui/command";
import { CommandDispatcher } from "@/features/command/command.dispatcher";
import { type CommandContext } from "@/features/command/command.context";
import { buildCommandIndex } from "@/features/command/command.index";
import { CommandService } from "@/features/command/command.service";
import {
  type CommandGroup as EngineCommandGroup,
  type CommandItem as EngineCommandItem,
} from "@/features/command/command.types";
import { type CatalogResponse, type Course } from "@/features/catalog/catalog.types";
import {
  type DriveItem,
  formatFileSize,
  getMimeLabel,
  isDriveFolder,
} from "@/features/drive/drive.types";

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

const GROUP_LABEL: Record<EngineCommandGroup, string> = {
  navigation: "Navigation",
  folders: "Folders",
  files: "Files",
  actions: "Actions",
  system: "System",
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
  const [catalogCourses, setCatalogCourses] = useState<Course[]>([]);
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);

  const pathSegments = useMemo(
    () => pathname.split("/").filter(Boolean),
    [pathname],
  );

  const departmentId = (pathSegments[0] ?? dashboardDepartment).toUpperCase();
  const semesterId = pathSegments[1] ?? String(dashboardSemester);
  const folderId = pathSegments[2];
  const isFolderScope = Boolean(folderId);
  const parsedSemester = useMemo(() => parseSemesterId(semesterId), [semesterId]);

  useEffect(() => {
    if (!parsedSemester) {
      setCatalogCourses([]);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        const response = await fetch(
          `/api/catalog/${encodeURIComponent(departmentId)}/${encodeURIComponent(String(parsedSemester))}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch catalog");
        }

        const data = (await response.json()) as CatalogResponse;
        if (!controller.signal.aborted) {
          setCatalogCourses(data.courses ?? []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setCatalogCourses([]);
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [departmentId, parsedSemester]);

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
      return;
    }

    const controller = new AbortController();

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
        }
      } catch {
        if (!controller.signal.aborted) {
          setDriveItems([]);
        }
      }
    };

    void run();
    return () => controller.abort();
  }, [activeDriveFolderId, isFolderScope]);

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
  }, [
    catalogCourses,
    departmentId,
    driveItems,
    isFolderScope,
    semesterId,
  ]);

  const fileCommands = useMemo<EngineCommandItem[]>(() => {
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
        keywords: ["file", "open", "preview", getMimeLabel(item.mimeType, item.name)],
        group: "files",
        scope: "folder",
        entityId: item.id,
        payload: {
          url: item.webViewLink,
        },
      }));
  }, [driveItems, isFolderScope]);

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
    registry.register("open-settings", () => router.push("/"));
    registry.register("toggle-view", () => undefined);
    registry.register("mark-offline", () => undefined);
    return registry;
  }, [router]);

  const results = useMemo(() => {
    return commandService.search(query, commandContext).slice(0, 24);
  }, [commandContext, commandService, query]);

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
      heading: GROUP_LABEL[group],
      items: groups.get(group) ?? [],
    })).filter((entry) => entry.items.length > 0);
  }, [results]);

  const executeCommand = useCallback(
    (item: EngineCommandItem) => {
      const externalUrl = item.payload?.url;
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
    [dispatcher, router],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isToggle =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isToggle) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ── Reset on navigation ── */
  useEffect(() => {
    queueMicrotask(() => {
      setOpen(false);
      setQuery("");
    });
  }, [pathname]);

  return (
    <>
      <div
        className={cn(
          "fixed bottom-4 left-4 right-4 z-40 mx-auto w-auto max-w-3xl transition-all duration-200",
          open ? "pointer-events-none translate-y-2 opacity-0" : "opacity-100",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-full text-left"
          aria-label="Open command bar"
        >
          <Command
            className={cn(
              "rounded-full border border-stone-200/60 bg-white p-0 shadow-md transition-all duration-200 hover:border-stone-300",
              "dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-600",
            )}
          >
            <div className="flex h-11 items-center gap-3 px-4 text-sm text-stone-500 dark:text-stone-400">
              <IconSearch className="size-4" />
              <span>{placeholder}</span>
              <span className="ml-auto rounded-sm border border-stone-300 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-400 dark:border-stone-700 dark:text-stone-500">
                {isFolderScope ? activeFolderTitle : "Global"}
              </span>
            </div>
          </Command>
        </button>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-stone-50/95 p-4 backdrop-blur-sm transition-all duration-200 dark:bg-stone-950/95",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-full w-full max-w-3xl flex-col transition-all duration-200",
            open ? "translate-y-0" : "translate-y-3",
          )}
        >
          <div className="mb-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              className="size-9 rounded-md"
              onClick={() => setOpen(false)}
            >
              <IconX className="size-4" />
              <span className="sr-only">Close command palette</span>
            </Button>
          </div>

          <Command
            shouldFilter={false}
            value={query}
            onValueChange={setQuery}
            className="rounded-lg border border-stone-200/60 bg-white p-1 shadow-md dark:border-stone-700 dark:bg-stone-900"
          >
            <CommandInput placeholder={placeholder} />
            <CommandList className="max-h-[60vh]">
              <CommandEmpty>No matching commands in this context.</CommandEmpty>
              {groupedResults.map((group) => (
                <CommandGroup key={group.group} heading={group.heading}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      className="min-h-11"
                      onSelect={() => executeCommand(item)}
                    >
                      <div className="min-w-0">
                        <div className="truncate">
                          <HighlightedText text={item.title} query={query} />
                        </div>
                        {item.subtitle ? (
                          <div className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                            <HighlightedText
                              text={item.subtitle}
                              query={query}
                            />
                          </div>
                        ) : null}
                      </div>
                      {typeof item.score === "number" ? (
                        <span className="ml-auto text-[10px] text-stone-400 dark:text-stone-500">
                          {item.score}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>
      </div>
    </>
  );
}
