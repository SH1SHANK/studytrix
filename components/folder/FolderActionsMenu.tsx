"use client";

import { EntityActionsMenu } from "@/components/file-manager/EntityActionsMenu";

type FolderActionsMenuProps = {
  entityId: string;
  title: string;
  description?: string;
  onOpen?: () => void;
  align?: "start" | "end";
  triggerClassName?: string;
};

export function FolderActionsMenu({
  entityId,
  title,
  description,
  onOpen,
  align = "end",
  triggerClassName,
}: FolderActionsMenuProps) {
  return (
    <EntityActionsMenu
      entityId={entityId}
      entityType="folder"
      title={title}
      description={description}
      align={align}
      triggerClassName={triggerClassName}
      onOpen={onOpen}
    />
  );
}
