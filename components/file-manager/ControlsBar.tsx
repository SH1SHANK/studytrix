"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { IconChevronDown, IconLayoutGrid, IconList } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type FileViewMode = "grid" | "list";
export type FileLayoutMode = "separated" | "combined";

type FileManagerViewModeContextValue = {
  viewMode: FileViewMode;
  layoutMode: FileLayoutMode;
  setViewMode: (mode: FileViewMode) => void;
  setLayoutMode: (mode: FileLayoutMode) => void;
};

const FileManagerViewModeContext =
  createContext<FileManagerViewModeContextValue | null>(null);

type FileManagerViewModeProviderProps = {
  children: React.ReactNode;
};

export function FileManagerViewModeProvider({
  children,
}: FileManagerViewModeProviderProps) {
  const [viewMode, setViewMode] = useState<FileViewMode>("list");
  const [layoutMode, setLayoutMode] = useState<FileLayoutMode>("separated");

  const value = useMemo(
    () => ({
      viewMode,
      layoutMode,
      setViewMode,
      setLayoutMode,
    }),
    [layoutMode, viewMode],
  );

  return (
    <FileManagerViewModeContext.Provider value={value}>
      {children}
    </FileManagerViewModeContext.Provider>
  );
}

export function useFileManagerViewMode() {
  const context = useContext(FileManagerViewModeContext);

  if (!context) {
    throw new Error(
      "useFileManagerViewMode must be used within FileManagerViewModeProvider.",
    );
  }

  return context;
}

export function ControlsBar() {
  const { viewMode, setViewMode, layoutMode, setLayoutMode } =
    useFileManagerViewMode();
  const [sortLabel, setSortLabel] = useState("Recent");

  return (
    <div className="mt-4">
      <div className="h-px bg-linear-to-r from-transparent via-stone-200 to-transparent dark:via-stone-800" />

      <div className="mt-4 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
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
              Sort: {sortLabel}
              <IconChevronDown className="size-4 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-36 border-stone-200 dark:border-stone-800"
            >
              <DropdownMenuItem onClick={() => setSortLabel("Recent")}>
                Recent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortLabel("Name")}>
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortLabel("Type")}>
                Type
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
              {layoutMode === "separated" ? "Separated" : "Combined"}
              <IconChevronDown className="size-4 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-40 border-stone-200 dark:border-stone-800"
            >
              <DropdownMenuItem onClick={() => setLayoutMode("separated")}>
                Separated View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLayoutMode("combined")}>
                Combined View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ToggleGroup
          type="single"
          value={[viewMode]}
          onValueChange={(value: string[]) => {
            const nextValue = value[0];
            if (nextValue === "grid" || nextValue === "list") {
              setViewMode(nextValue);
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
    </div>
  );
}
