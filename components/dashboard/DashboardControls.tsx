import { IconChevronDown, IconLayoutGrid, IconList } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type DashboardControlsProps = {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
};

export function DashboardControls({
  viewMode,
  onViewModeChange,
}: DashboardControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-md border-stone-200 px-3 text-stone-700 dark:border-stone-800 dark:text-stone-200"
            />
          }
        >
          Sort by: Recent
          <IconChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem>Recent</DropdownMenuItem>
          <DropdownMenuItem>Name</DropdownMenuItem>
          <DropdownMenuItem>Size</DropdownMenuItem>
          <DropdownMenuItem>Files Count</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToggleGroup
        type="single"
        value={[viewMode]}
        onValueChange={(value: string[]) => {
          const next = value[0];
          if (next === "grid" || next === "list") {
            onViewModeChange(next);
          }
        }}
        variant="outline"
        spacing={1}
      >
        <ToggleGroupItem
          value="grid"
          aria-label="Grid view"
          className="h-9 min-w-9 rounded-md border-stone-200 data-pressed:bg-indigo-600 data-pressed:text-white data-pressed:shadow-sm dark:border-stone-800 dark:data-pressed:bg-indigo-500"
        >
          <IconLayoutGrid className="size-4" />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="list"
          aria-label="List view"
          className="h-9 min-w-9 rounded-md border-stone-200 data-pressed:bg-indigo-600 data-pressed:text-white data-pressed:shadow-sm dark:border-stone-800 dark:data-pressed:bg-indigo-500"
        >
          <IconList className="size-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
