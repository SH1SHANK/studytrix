"use client";

import { useMemo, useState } from "react";
import { IconStack2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBytes } from "@/features/storage/storage.quota";
import type { CourseStorage } from "@/features/storage/storage.types";

type SortBy = "bytes" | "count";

interface CourseStorageTableProps {
  courses: CourseStorage[];
}

export function CourseStorageTable({ courses }: CourseStorageTableProps) {
  const [sortBy, setSortBy] = useState<SortBy>("bytes");

  const sortedCourses = useMemo(() => {
    return [...courses].sort((left, right) => {
      if (sortBy === "count") {
        if (left.fileCount !== right.fileCount) {
          return right.fileCount - left.fileCount;
        }

        return right.bytes - left.bytes;
      }

      if (left.bytes !== right.bytes) {
        return right.bytes - left.bytes;
      }

      return right.fileCount - left.fileCount;
    });
  }, [courses, sortBy]);
  const maxBytes = sortedCourses[0]?.bytes ?? 0;

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/80 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle id="course-storage-title" className="text-base font-semibold text-foreground">
          Storage by Course
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={sortBy === "bytes" ? "default" : "outline"}
            onClick={() => {
              setSortBy("bytes");
            }}
            aria-pressed={sortBy === "bytes"}
          >
            Sort by Bytes
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sortBy === "count" ? "default" : "outline"}
            onClick={() => {
              setSortBy("count");
            }}
            aria-pressed={sortBy === "count"}
          >
            Sort by Files
          </Button>
        </div>

        {sortedCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No course storage data available yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedCourses.map((course, index) => {
              const percent = maxBytes > 0 ? (course.bytes / maxBytes) * 100 : 0;

              return (
                <li
                  key={course.courseCode}
                  className="rounded-xl border border-border/80 bg-muted/70 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                      <IconStack2 className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{course.courseCode}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border/80">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percent.toFixed(1)}%`,
                        backgroundColor: "var(--primary)",
                      }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{course.fileCount} files</span>
                    <span>{formatBytes(course.bytes)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
