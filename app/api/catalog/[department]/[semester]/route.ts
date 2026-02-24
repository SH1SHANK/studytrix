import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 300;

const CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");
const DEPARTMENT_PATTERN = /^[A-Z]{2,5}$/;
const SEMESTER_PATTERN = /^[1-9][0-9]*$/;
const DRIVE_FOLDER_ID_PATTERN = /^[a-zA-Z0-9_-]{10,}$/;
const MAX_SEMESTER = 8;
const CATALOG_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

export type CourseType = "core" | "elective" | "lab";

export interface Catalog {
  version: string;
  lastUpdated: string;
  departments: Record<string, Department>;
}

export interface Department {
  name: string;
  semesters: Record<string, Semester>;
}

export interface Semester {
  courses: Course[];
}

export interface Course {
  courseCode: string;
  courseName: string;
  credits: number;
  driveFolderId: string;
  courseType: CourseType;
}

type CatalogCache = {
  data: Catalog;
  mtimeMs: number;
  loadedAt: number;
} | null;

type RouteParams = {
  department: string;
  semester: string;
};

type RouteContext = {
  params: Promise<RouteParams>;
};

class CatalogSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogSchemaError";
  }
}

let catalogCache: CatalogCache = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCourseType(value: unknown): value is CourseType {
  return value === "core" || value === "elective" || value === "lab";
}

function isValidDriveFolderId(value: unknown): value is string {
  return typeof value === "string" && DRIVE_FOLDER_ID_PATTERN.test(value);
}

function decodeAndTrimParam(value: string): string | null {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return null;
  }
}

function normalizeDepartmentParam(value: string): string | null {
  const decoded = decodeAndTrimParam(value);
  if (!decoded) {
    return null;
  }

  if (!DEPARTMENT_PATTERN.test(decoded)) {
    return null;
  }

  return decoded;
}

function normalizeSemesterParam(value: string): number | null {
  const decoded = decodeAndTrimParam(value);
  if (!decoded || !SEMESTER_PATTERN.test(decoded)) {
    return null;
  }

  const semesterNumber = Number(decoded);
  if (
    !Number.isInteger(semesterNumber) ||
    semesterNumber < 1 ||
    semesterNumber > MAX_SEMESTER
  ) {
    return null;
  }

  return semesterNumber;
}

function assertValidCourse(value: unknown, contextPath: string): asserts value is Course {
  if (!isRecord(value)) {
    throw new CatalogSchemaError(`Invalid course object at ${contextPath}`);
  }

  if (!isNonEmptyString(value.courseCode)) {
    throw new CatalogSchemaError(`Invalid courseCode at ${contextPath}`);
  }

  if (!isNonEmptyString(value.courseName)) {
    throw new CatalogSchemaError(`Invalid courseName at ${contextPath}`);
  }

  if (!isFiniteNumber(value.credits)) {
    throw new CatalogSchemaError(`Invalid credits at ${contextPath}`);
  }

  if (!isValidDriveFolderId(value.driveFolderId)) {
    throw new CatalogSchemaError(`Invalid driveFolderId at ${contextPath}`);
  }

  if (!isCourseType(value.courseType)) {
    throw new CatalogSchemaError(`Invalid courseType at ${contextPath}`);
  }
}

function assertValidSemester(value: unknown, contextPath: string): asserts value is Semester {
  if (!isRecord(value)) {
    throw new CatalogSchemaError(`Invalid semester at ${contextPath}`);
  }

  const { courses } = value;
  if (!Array.isArray(courses)) {
    throw new CatalogSchemaError(`Missing courses array at ${contextPath}`);
  }

  for (let i = 0; i < courses.length; i += 1) {
    assertValidCourse(courses[i], `${contextPath}.courses[${i}]`);
  }
}

function assertValidCatalog(value: unknown): asserts value is Catalog {
  if (!isRecord(value)) {
    throw new CatalogSchemaError("Catalog root must be an object");
  }

  if (!isNonEmptyString(value.version)) {
    throw new CatalogSchemaError("Catalog version must be a non-empty string");
  }

  if (!isNonEmptyString(value.lastUpdated)) {
    throw new CatalogSchemaError("Catalog lastUpdated must be a non-empty string");
  }

  if (!isRecord(value.departments)) {
    throw new CatalogSchemaError("Catalog departments must be an object");
  }

  const departmentEntries = Object.entries(value.departments);
  for (const [departmentKey, departmentValue] of departmentEntries) {
    if (!isRecord(departmentValue)) {
      throw new CatalogSchemaError(`Department ${departmentKey} must be an object`);
    }

    if (!isNonEmptyString(departmentValue.name)) {
      throw new CatalogSchemaError(`Department ${departmentKey} has invalid name`);
    }

    if (!isRecord(departmentValue.semesters)) {
      throw new CatalogSchemaError(
        `Department ${departmentKey} semesters must be an object`,
      );
    }

    const semesterEntries = Object.entries(departmentValue.semesters);
    for (const [semesterKey, semesterValue] of semesterEntries) {
      assertValidSemester(
        semesterValue,
        `departments.${departmentKey}.semesters.${semesterKey}`,
      );
    }
  }
}

async function loadCatalog(): Promise<Catalog> {
  let fileMtimeMs: number;

  try {
    const fileStats = await fs.stat(CATALOG_PATH);
    fileMtimeMs = fileStats.mtimeMs;
  } catch (error) {
    if (catalogCache) {
      console.error("Catalog stat failed, serving stale cache:", error);
      return catalogCache.data;
    }

    throw new CatalogSchemaError("Catalog file is unavailable");
  }

  if (catalogCache && catalogCache.mtimeMs === fileMtimeMs) {
    return catalogCache.data;
  }

  try {
    const rawCatalog = await fs.readFile(CATALOG_PATH, "utf8");
    const parsedCatalog = JSON.parse(rawCatalog) as unknown;

    assertValidCatalog(parsedCatalog);

    const nextCache: Exclude<CatalogCache, null> = {
      data: parsedCatalog,
      mtimeMs: fileMtimeMs,
      loadedAt: Date.now(),
    };

    catalogCache = nextCache;
    return nextCache.data;
  } catch (error) {
    if (catalogCache) {
      console.error("Catalog read/parse/validation failed, serving stale cache:", error);
      return catalogCache.data;
    }

    if (error instanceof SyntaxError) {
      throw new CatalogSchemaError("Catalog JSON is malformed");
    }

    if (error instanceof CatalogSchemaError) {
      throw error;
    }

    throw new CatalogSchemaError("Catalog read failed");
  }
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { department, semester } = await params;

    const normalizedDepartment = normalizeDepartmentParam(department);
    if (!normalizedDepartment) {
      return NextResponse.json(
        { error: "Invalid department format" },
        { status: 400 },
      );
    }

    const normalizedSemester = normalizeSemesterParam(semester);
    if (!normalizedSemester) {
      return NextResponse.json(
        { error: "Invalid semester format" },
        { status: 400 },
      );
    }

    const catalog = await loadCatalog();

    if (
      !Object.prototype.hasOwnProperty.call(
        catalog.departments,
        normalizedDepartment,
      )
    ) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const departmentCatalog = catalog.departments[normalizedDepartment];
    const semesterKey = String(normalizedSemester);

    if (
      !Object.prototype.hasOwnProperty.call(
        departmentCatalog.semesters,
        semesterKey,
      )
    ) {
      return NextResponse.json({ error: "Semester not found" }, { status: 404 });
    }

    const semesterCatalog = departmentCatalog.semesters[semesterKey];
    assertValidSemester(semesterCatalog, `departments.${normalizedDepartment}.semesters.${semesterKey}`);

    return NextResponse.json(
      { courses: semesterCatalog.courses },
      {
        status: 200,
        headers: { "Cache-Control": CATALOG_CACHE_CONTROL },
      },
    );
  } catch (error) {
    console.error("Catalog route error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
