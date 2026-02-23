"use client";

import { EntityActionsMenu } from "@/components/file-manager/EntityActionsMenu";

type FolderActionsMenuProps = {
  entityId: string;
  title: string;
  description?: string;
  align?: "start" | "end";
  triggerClassName?: string;
  onMakeOffline?: (sourceElement?: HTMLElement) => void;
  onRemoveOffline?: () => void;
  isOffline?: boolean;
  isDownloading?: boolean;
};

export function FolderActionsMenu({
  entityId,
  title,
  description,
  align = "end",
  triggerClassName,
  onMakeOffline,
  onRemoveOffline,
  isOffline,
  isDownloading,
}: FolderActionsMenuProps) {
  return (
    <EntityActionsMenu
      entityId={entityId}
      entityType="folder"
      title={title}
      description={description}
      align={align}
      triggerClassName={triggerClassName}
      onMakeOffline={onMakeOffline}
      onRemoveOffline={onRemoveOffline}
      isOffline={isOffline}
      isDownloading={isDownloading}
    />
  );
}
