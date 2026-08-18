import type { Metadata } from "next";
import { WorkspaceFolderClient } from "@/features/workspace/ui/WorkspaceFolderClient";

interface PageProps {
  params: Promise<{
    workspaceId: string;
    folderId: string;
  }>;
  searchParams: Promise<{
    name?: string;
    trail?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { workspaceId, folderId } = await params;
  const { name } = await searchParams;
  const folderName = name || "Folder";

  return {
    title: `${folderName} · Studytrix`,
    description: `Browse ${folderName} study resources.`,
    alternates: {
      canonical: `/workspace/${encodeURIComponent(workspaceId)}/folder/${encodeURIComponent(folderId)}`,
    },
  };
}

export default async function FolderPage({ params }: PageProps) {
  const { workspaceId, folderId } = await params;
  return <WorkspaceFolderClient workspaceId={workspaceId} folderId={folderId} />;
}
