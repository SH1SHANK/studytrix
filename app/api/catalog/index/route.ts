import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 300;

const CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");
const DRIVE_FOLDER_ID_PATTERN = /^[a-zA-Z0-9_-]{10,}$/;

type RawCourse = {
  driveFolderId: string;
};

type RawSemester = {
  courses: RawCourse[];
};

type RawDepartment = {
  name: string;
  semesters: Record<string, RawSemester>;
};

type RawCatalog = {
  departments: Record<string, RawDepartment>;
};

export type CatalogIndexEntry = {
  id: string;
  name: string;
  /** Semester numbers that have ≥1 course with a real driveFolderId */
  availableSemesters: number[];
};

export type CatalogIndexResponse = {
  departments: CatalogIndexEntry[];
};

function hasRealFolder(course: RawCourse): boolean {
  return DRIVE_FOLDER_ID_PATTERN.test(course.driveFolderId);
}

export async function GET(): Promise<NextResponse> {
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf8");
    const catalog = JSON.parse(raw) as RawCatalog;

    const result: CatalogIndexEntry[] = [];

    for (const [id, dept] of Object.entries(catalog.departments)) {
      const availableSemesters: number[] = [];

      for (const [semKey, sem] of Object.entries(dept.semesters)) {
        const semNum = Number(semKey);
        if (!Number.isInteger(semNum)) continue;
        const hasContent = sem.courses.some(hasRealFolder);
        if (hasContent) availableSemesters.push(semNum);
      }

      // Only include department if it has at least one semester with content
      if (availableSemesters.length > 0) {
        result.push({
          id,
          name: dept.name,
          availableSemesters: availableSemesters.sort((a, b) => a - b),
        });
      }
    }

    return NextResponse.json(
      { departments: result } satisfies CatalogIndexResponse,
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
      },
    );
  } catch (error) {
    console.error("Catalog index error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
