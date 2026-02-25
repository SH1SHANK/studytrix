import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import {
  ControlsBar,
  FileManagerViewModeProvider,
} from "@/features/file/ui/file-manager/ControlsBar";
import { FileList } from "@/features/file/ui/file-manager/FileList";
import { StickyHeader } from "@/features/file/ui/file-manager/StickyHeader";
import {
  parseFolderTrailParam,
  FOLDER_TRAIL_IDS_QUERY_PARAM,
  FOLDER_TRAIL_QUERY_PARAM,
} from "@/features/navigation/folder-trail";
import {
  buildPersonalFolderRouteHref,
  PERSONAL_BREADCRUMB_ROOT_LABEL,
} from "@/features/navigation/repository-route";

type PersonalFileManagerPageProps = {
  params: Promise<{
    folderId: string;
  }>;
  searchParams: Promise<{
    name?: string;
    trail?: string;
    trailIds?: string;
  }>;
};

function decodeOptionalText(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const decoded = decodeURIComponent(value).trim();
  return decoded || null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PersonalFileManagerPageProps): Promise<Metadata> {
  const { folderId } = await params;
  const query = await searchParams;
  const routeFolderId = decodeURIComponent(folderId).trim();
  const folderName = decodeOptionalText(query.name) ?? routeFolderId;

  return {
    title: `${folderName} · ${PERSONAL_BREADCRUMB_ROOT_LABEL}`,
    description:
      `Browse ${folderName} in your Personal repository. Open folders and files with route-scoped navigation.`,
    alternates: {
      canonical: `/personal/${encodeURIComponent(routeFolderId)}`,
    },
  };
}

export default async function PersonalFolderPage({
  params,
  searchParams,
}: PersonalFileManagerPageProps) {
  const { folderId } = await params;
  const query = await searchParams;
  const routeFolderId = decodeURIComponent(folderId).trim();
  const folderName = decodeOptionalText(query.name) ?? routeFolderId;
  const trailLabelsFromQuery = parseFolderTrailParam(query[FOLDER_TRAIL_QUERY_PARAM]);
  const trailIdsFromQuery = parseFolderTrailParam(query[FOLDER_TRAIL_IDS_QUERY_PARAM]);
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

  const breadcrumbSegments = [
    {
      label: PERSONAL_BREADCRUMB_ROOT_LABEL,
      href: "/?repo=personal",
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
          ? buildPersonalFolderRouteHref({
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
          folderId={routeFolderId}
          repositoryKind="personal"
          breadcrumbSegments={breadcrumbSegments}
        />
        <FileManagerViewModeProvider>
          <ControlsBar />
          <FileList
            driveFolderId={routeFolderId || null}
            courseName={folderName}
          />
        </FileManagerViewModeProvider>
      </div>
    </AppShell>
  );
}
