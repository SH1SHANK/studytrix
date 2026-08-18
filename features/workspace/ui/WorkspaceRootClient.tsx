"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StickyHeader } from "@/features/file/ui/file-manager/StickyHeader";
import { ControlsBar, FileManagerViewModeProvider } from "@/features/file/ui/file-manager/ControlsBar";
import { FileList } from "@/features/file/ui/file-manager/FileList";
import { useWorkspaceStore } from "@/features/workspace/workspace.store";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface WorkspaceRootClientProps {
  workspaceId: string;
}

export function WorkspaceRootClient({ workspaceId }: WorkspaceRootClientProps) {
  const router = useRouter();
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const hydrated = useWorkspaceStore((state) => state.hydrated);

  const workspace = useMemo(
    () => workspaces.find((w) => w.id === workspaceId) ?? null,
    [workspaceId, workspaces],
  );

  const breadcrumbs = useMemo(() => {
    return [
      { label: "Workspaces", href: "/" },
      { label: workspace?.name || "Workspace", href: `/workspace/${workspaceId}` },
    ];
  }, [workspace?.name, workspaceId]);

  if (hydrated && !workspace) {
    return (
      <AppShell showHeader={false}>
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center p-12 text-center">
          <h2 className="text-lg font-semibold">Workspace not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This workspace may have been removed or does not exist.
          </p>
          <Button onClick={() => router.push("/")} className="mt-4 gap-2">
            <ArrowLeft className="size-4" />
            Back to Workspaces
          </Button>
        </div>
      </AppShell>
    );
  }

  const driveFolderId = workspace?.driveFolderId || "";

  return (
    <FileManagerViewModeProvider>
      <AppShell showHeader={false}>
        <StickyHeader
          folderName={workspace?.name || "Workspace"}
          folderId={driveFolderId}
          breadcrumbSegments={breadcrumbs}
        />
        <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <ControlsBar />
          {driveFolderId ? (
            <FileList
              driveFolderId={driveFolderId}
              workspaceId={workspaceId}
              folderName={workspace?.name}
            />
          ) : null}
        </main>
      </AppShell>
    </FileManagerViewModeProvider>
  );
}
