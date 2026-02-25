"use client";

import dynamic from "next/dynamic";
import { useDownloadStore } from "@/features/download/download.store";
import { useSelectionStore } from "@/features/selection/selection.store";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
import { useStudySetsStore } from "@/features/custom-folders/study-sets.store";
import { useDownloadRiskDialogState } from "@/ui/hooks/useDownloadRiskGate";

const SelectionToolbar = dynamic(
  () => import("@/features/file/ui/file-manager/SelectionToolbar").then((mod) => mod.SelectionToolbar),
  { ssr: false },
);

const AssignTagsDrawer = dynamic(
  () => import("@/features/tags/ui/AssignTagsDrawer").then((mod) => mod.AssignTagsDrawer),
  { ssr: false },
);

const DownloadDrawer = dynamic(
  () => import("@/features/download/ui/DownloadDrawer").then((mod) => mod.DownloadDrawer),
  { ssr: false },
);

const DownloadFloatingIndicator = dynamic(
  () =>
    import("@/features/download/ui/DownloadFloatingIndicator").then(
      (mod) => mod.DownloadFloatingIndicator,
    ),
  { ssr: false },
);

const DownloadRiskDialog = dynamic(
  () => import("@/features/download/ui/DownloadRiskDialog").then((mod) => mod.DownloadRiskDialog),
  { ssr: false },
);

const StudySetPickerSheet = dynamic(
  () => import("@/features/custom-folders/ui/StudySetPickerSheet").then((mod) => mod.StudySetPickerSheet),
  { ssr: false },
);

const CodePreviewRuntime = dynamic(
  () => import("@/features/custom-folders/ui/CodePreviewRuntime").then((mod) => mod.CodePreviewRuntime),
  { ssr: false },
);

export function RootRuntimeMounts() {
  const isSelectionMode = useSelectionStore((state) => state.isSelectionMode);
  const selectedCount = useSelectionStore((state) => state.selectedIds.size);
  const assignTagsOpen = useTagAssignmentStore((state) => state.isOpen);
  const downloadDrawerOpen = useDownloadStore((state) => state.isDrawerOpen);
  const activeDownloadCount = useDownloadStore((state) => state.activeCount);
  const riskDialogOpen = useDownloadRiskDialogState().open;
  const studySetPickerFileId = useStudySetsStore((state) => state.pickerFileId);

  return (
    <>
      {isSelectionMode || selectedCount > 0 ? <SelectionToolbar /> : null}
      {assignTagsOpen ? <AssignTagsDrawer /> : null}
      {downloadDrawerOpen ? <DownloadDrawer /> : null}
      {activeDownloadCount > 0 ? <DownloadFloatingIndicator /> : null}
      {riskDialogOpen ? <DownloadRiskDialog /> : null}
      {studySetPickerFileId ? <StudySetPickerSheet /> : null}
      <CodePreviewRuntime />
    </>
  );
}
