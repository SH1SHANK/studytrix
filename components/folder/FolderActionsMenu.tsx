"use client";

import {
  IconDotsVertical,
  IconFolderOpen,
  IconPin,
  IconPencil,
  IconStar,
  IconWifi0,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FolderActionsMenuProps = {
  align?: "start" | "end";
  triggerClassName?: string;
};

function stopPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function FolderActionsMenu({
  align = "end",
  triggerClassName,
}: FolderActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Open folder actions"
            variant="ghost"
            size="icon"
            onClick={stopPropagation}
            onPointerDown={stopPropagation}
            className={cn(
              "size-11 rounded-md text-stone-500 transition-all duration-200 active:scale-[0.98] hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200",
              triggerClassName,
            )}
          />
        }
      >
        <IconDotsVertical className="size-4 opacity-80" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-52 border-stone-800 bg-stone-900 text-stone-100 shadow-md dark:border-stone-700 dark:bg-stone-800"
      >
        <DropdownMenuItem
          className="min-h-11 focus:bg-stone-800 focus:text-stone-100 dark:focus:bg-stone-700"
          onClick={stopPropagation}
        >
          <IconFolderOpen className="opacity-70" />
          Open
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 focus:bg-stone-800 focus:text-stone-100 dark:focus:bg-stone-700"
          onClick={stopPropagation}
        >
          <IconPencil className="opacity-70" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 focus:bg-stone-800 focus:text-stone-100 dark:focus:bg-stone-700"
          onClick={stopPropagation}
        >
          <IconStar className="opacity-70" />
          Mark as Important
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 focus:bg-stone-800 focus:text-stone-100 dark:focus:bg-stone-700"
          onClick={stopPropagation}
        >
          <IconPin className="opacity-70" />
          Pin
        </DropdownMenuItem>
        <DropdownMenuItem
          className="min-h-11 focus:bg-stone-800 focus:text-stone-100 dark:focus:bg-stone-700"
          onClick={stopPropagation}
        >
          <IconWifi0 className="opacity-70" />
          Make Available Offline
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
