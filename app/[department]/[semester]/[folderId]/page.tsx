import type { Metadata } from "next";
import { headers } from "next/headers";

import { AppShell } from "@/components/layout/AppShell";
import {
  ControlsBar,
  FileManagerViewModeProvider,
} from "@/components/file-manager/ControlsBar";
import { FileList } from "@/components/file-manager/FileList";
import { StickyHeader } from "@/components/file-manager/StickyHeader";
import { type CatalogResponse, type Course } from "@/features/catalog/catalog.types";
import {
  buildFolderRouteHref,
  parseFolderTrailParam,
  FOLDER_TRAIL_IDS_QUERY_PARAM,
  FOLDER_TRAIL_QUERY_PARAM,
} from "@/features/navigation/folder-trail";
import { getDepartmentName } from "@/lib/academic";

type FileManagerPageProps = {
  params: Promise<{
    department: string;
    semester: string;
    folderId: string;
  }>;
  searchParams: Promise<{
    name?: string;
    trail?: string;
    trailIds?: string;
  }>;
};

function formatSemester(value: string) {
  const clean = decodeURIComponent(value).replace(/[-_]/g, " ").trim();
  const match = clean.match(/\d+/);
  if (match?.[0]) {
    return `Semester ${match[0]}`;
  }
  return clean;
}

function parseSemesterNumber(value: string): number | null {
  const parsed = Number.parseInt(value.match(/\d+/)?.[0] ?? value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    return null;
  }
  return parsed;
}

function decodeOptionalText(value: string | undefined): string | null {
  if (!value) return null;
  const decoded = decodeURIComponent(value).trim();
  return decoded || null;
}

type CourseInfo = {
  courseName: string;
  driveFolderId: string;
};

export async function generateMetadata({
  params,
  searchParams,
}: FileManagerPageProps): Promise<Metadata> {
  const { department, semester, folderId } = await params;
  const query = await searchParams;

  const departmentId = decodeURIComponent(department).trim().toUpperCase();
  const departmentLabel = getDepartmentName(departmentId);
  const semesterLabel = formatSemester(semester);
  const routeFolderId = decodeURIComponent(folderId).trim();
  const folderName = decodeOptionalText(query.name) ?? routeFolderId;
  const canonicalPath = `/${encodeURIComponent(department)}/${encodeURIComponent(semester)}/${encodeURIComponent(routeFolderId)}`;

  return {
    title: `${folderName} · ${departmentLabel} ${semesterLabel}`,
    description:
      `Browse ${folderName} in ${departmentLabel} ${semesterLabel}. Use scoped search to find nested files, folders, and tagged study resources faster.`,
    alternates: {
      canonical: canonicalPath,
    },
  };
}

async function fetchCourseInfo(
  origin: string,
  departmentId: string,
  semester: number,
  folderId: string,
): Promise<CourseInfo | null> {
  try {
    const response = await fetch(
      `${origin}/api/catalog/${encodeURIComponent(departmentId)}/${encodeURIComponent(String(semester))}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as CatalogResponse;
    const course = data.courses.find(
      (item: Course) => item.courseCode === folderId || item.driveFolderId === folderId,
    );

    if (!course) {
      return null;
    }

    return {
      courseName: course.courseName,
      driveFolderId: course.driveFolderId,
    };
  } catch {
    return null;
  }
}

export default async function Page({
  params,
  searchParams,
}: FileManagerPageProps) {
  const { department, semester, folderId } = await params;
  const query = await searchParams;
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${protocol}://${host}` : null;

  const departmentId = decodeURIComponent(department).trim().toUpperCase();
  const departmentLabel = getDepartmentName(departmentId);
  const semesterLabel = formatSemester(semester);
  const routeFolderId = decodeURIComponent(folderId).trim();
  const folderNameFromQuery = decodeOptionalText(query.name);
  const trailLabelsFromQuery = parseFolderTrailParam(query[FOLDER_TRAIL_QUERY_PARAM]);
  const trailIdsFromQuery = parseFolderTrailParam(query[FOLDER_TRAIL_IDS_QUERY_PARAM]);
  const semesterNumber = parseSemesterNumber(semester);
  const shouldResolveCourseInfo =
    origin !== null && semesterNumber !== null && !folderNameFromQuery;

  const courseInfo = shouldResolveCourseInfo
    ? await fetchCourseInfo(origin, departmentId, semesterNumber, routeFolderId)
    : null;
  const folderName = courseInfo?.courseName ?? folderNameFromQuery ?? routeFolderId;
  const driveFolderId = courseInfo?.driveFolderId ?? routeFolderId;
  const breadcrumbTrailLabels = trailLabelsFromQuery.length > 0
    ? [...trailLabelsFromQuery]
    : [folderName];
  const breadcrumbTrailIds = trailIdsFromQuery.length > 0
    ? [...trailIdsFromQuery]
    : [routeFolderId];

  if (breadcrumbTrailLabels[breadcrumbTrailLabels.length - 1] !== folderName) {
    breadcrumbTrailLabels.push(folderName);
  }
  if (breadcrumbTrailIds[breadcrumbTrailIds.length - 1] !== routeFolderId) {
    breadcrumbTrailIds.push(routeFolderId);
  }
  const semesterForLink = semesterNumber ?? Number.parseInt(semester, 10);
  const rootQueryBase = `department=${encodeURIComponent(departmentId)}`;
  const rootQueryWithSemester = Number.isInteger(semesterForLink)
    ? `${rootQueryBase}&semester=${encodeURIComponent(String(semesterForLink))}`
    : rootQueryBase;
  const breadcrumbSegments = [
    {
      label: departmentLabel,
      href: `/?${rootQueryWithSemester}`,
    },
    {
      label: semesterLabel,
      href: `/?${rootQueryWithSemester}`,
    },
    ...breadcrumbTrailLabels.map((label, index) => {
      const folderIdForSegment =
        breadcrumbTrailIds[index]
        ?? (index === breadcrumbTrailLabels.length - 1 ? routeFolderId : null);
      const trailLabelsForSegment = breadcrumbTrailLabels.slice(0, index + 1);
      const trailIdsForSegment = breadcrumbTrailIds.slice(0, index + 1);

      return {
        label,
        href: folderIdForSegment
          ? buildFolderRouteHref({
            departmentId,
            semesterId: semester,
            folderId: folderIdForSegment,
            folderName: label,
            trailLabels: trailLabelsForSegment,
            trailIds: trailIdsForSegment,
          })
          : "#",
      };
    }),
  ];

  return (
    <AppShell
      showHeader={false}
      commandPlaceholder={`Search in ${folderName}`}
    >
      <div className="min-h-full bg-background">
        <StickyHeader
          folderName={folderName}
          breadcrumbSegments={breadcrumbSegments}
        />
        <FileManagerViewModeProvider>
          <ControlsBar />
          <FileList
            driveFolderId={driveFolderId || null}
            courseName={folderName}
          />
        </FileManagerViewModeProvider>
      </div>
    </AppShell>
  );
}
