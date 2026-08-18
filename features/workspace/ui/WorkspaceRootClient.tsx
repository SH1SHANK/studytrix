"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StickyHeader } from "@/features/file/ui/file-manager/StickyHeader";
import { ControlsBar, FileManagerViewModeProvider } from "@/features/file/ui/file-manager/ControlsBar";
import { FileList } from "@/features/file/ui/file-manager/FileList";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface WorkspaceRootClientProps {
  workspaceId: string;
}

export function WorkspaceRootClient({ workspaceId }: WorkspaceRootClientProps) {
  const router = useRouter();
  const { workspace, loading } = useWorkspace(workspaceId);

  const breadcrumbs = useMemo(() => {
    return [
      { label: "Workspaces", href: "/" },
      { label: workspace?.name || "Workspace", href: `/workspace/${workspaceId}` },
    ];
  }, [workspace?.name, workspaceId]);

  if (loading && !workspace) {
    return (
      <AppShell showHeader={false}>
        <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading workspace...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!loading && !workspace) {
    return (
      <AppShell showHeader={false}>
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center p-12 text-center">
          <h2 className="text-lg font-semibold text-foreground">Workspace not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This workspace may have been removed or does not exist on this device.
          </p>
          <Button onClick={() => router.push("/")} className="mt-4 gap-2">
            <ArrowLeft className="size-4" />
            Back to Workspaces
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <FileManagerViewModeProvider>
      <AppShell showHeader={false}>
        <StickyHeader
          folderName={workspace?.name || "Workspace"}
          folderId=""
          breadcrumbSegments={breadcrumbs}
        />
        <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <ControlsBar />
          <FileList
            workspaceId={workspaceId}
            folderId=""
            folderName={workspace?.name}
          />
        </main>
      </AppShell>
    </FileManagerViewModeProvider>
  );
}
