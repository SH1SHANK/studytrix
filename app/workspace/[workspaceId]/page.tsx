import type { Metadata } from "next";
import { WorkspaceRootClient } from "@/features/workspace/ui/WorkspaceRootClient";

interface PageProps {
  params: Promise<{
    workspaceId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { workspaceId } = await params;
  return {
    title: `Workspace · Studytrix`,
    description: `Browse course files, folders, and resources.`,
    alternates: {
      canonical: `/workspace/${encodeURIComponent(workspaceId)}`,
    },
  };
}

export default async function WorkspacePage({ params }: PageProps) {
  const { workspaceId } = await params;
  return <WorkspaceRootClient workspaceId={workspaceId} />;
}
