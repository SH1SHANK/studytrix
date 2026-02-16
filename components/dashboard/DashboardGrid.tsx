"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { TagFilterRow } from "@/components/dashboard/TagFilterRow";
import { FolderCard } from "@/components/folder/FolderCard";
import { ListRow } from "@/components/folder/ListRow";
import { useAcademicContext } from "@/components/layout/AcademicContext";
import { useCatalog } from "@/features/catalog/catalog.hooks";
import { type Course } from "@/features/catalog/catalog.types";
import { Skeleton } from "@/components/ui/skeleton";

type FolderColor = "indigo" | "emerald" | "amber" | "sky" | "rose" | "stone";

const FOLDER_COLORS: FolderColor[] = [
  "indigo",
  "emerald",
  "amber",
  "sky",
  "rose",
  "stone",
];

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

  if (course.courseType === "lab") {
    meta.push("Lab");
  }
  if (course.courseType === "elective") {
    meta.push("Elective");
  }

  return meta.slice(0, 2).join(" · ") || "Course folder";
}

export function DashboardGrid() {
  const router = useRouter();
  const { department, semester } = useAcademicContext();
  const { courses, isLoading, error } = useCatalog(department, semester);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const folders = useMemo(
    () =>
      courses.map((course) => ({
        id: course.courseCode,
        routeId: course.driveFolderId,
        title: course.courseName,
        meta: getCourseMeta(course),
        variant: (course.courseType !== "core"
          ? "accent"
          : "default") as "default" | "accent",
        color: getColorFromCourseCode(course.courseCode),
      })),
    [courses],
  );

  const handleOpenFolder = useCallback(
    (driveFolderId: string, courseName: string) => {
      router.push(
        `/${encodeURIComponent(department)}/${encodeURIComponent(String(semester))}/${encodeURIComponent(driveFolderId)}?name=${encodeURIComponent(courseName)}`,
      );
    },
    [department, semester, router],
  );

  return (
    <section className="mt-4 pb-32">
      <TagFilterRow />

      {/* Divider gradient — prevents blank feeling between header and content */}
      <div className="mx-4 mt-4 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent dark:via-stone-800" />

      {/* Level 1: Section container panel with backdrop */}
      <div className="mx-4 mt-4 rounded-xl border border-stone-200/60 bg-white/70 p-4 shadow-sm backdrop-blur-[2px] dark:border-stone-800/60 dark:bg-stone-900/60">
        <DashboardControls viewMode={viewMode} onViewModeChange={setViewMode} />

        {isLoading ? (
          viewMode === "grid" ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={`skeleton-grid-${index}`} className="h-[110px]" />
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={`skeleton-list-${index}`} className="h-16" />
              ))}
            </div>
          )
        ) : error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : folders.length === 0 ? (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900/70 dark:text-stone-300">
            No courses found for {department} Semester {semester}.
          </div>
        ) : viewMode === "grid" ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                title={folder.title}
                meta={folder.meta}
                variant={folder.variant}
                color={folder.color}
                onOpen={() => handleOpenFolder(folder.routeId, folder.title)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {folders.map((folder) => (
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
    </section>
  );
}
