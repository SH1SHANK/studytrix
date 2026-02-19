"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  IconChevronDown,
  IconLayoutGrid,
  IconList,
} from "@tabler/icons-react";

import { DownloadButton } from "@/components/download/DownloadButton";
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
  const { viewMode, setViewMode } = useFileManagerViewMode();
  const [sortLabel, setSortLabel] = useState("Recent");

  return (
    <div className="sticky top-0 z-20 bg-[#F7F7F5] dark:bg-stone-950">
      {/* Gradient separator — matches Dashboard */}
      <div className="h-px bg-linear-to-r from-transparent via-stone-200 to-transparent dark:via-stone-800" />

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {/* Left group — Downloads + Sort */}
        <div className="flex items-center gap-2">
          <DownloadButton
            className="h-9 gap-1.5 rounded-lg border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition-all duration-200 hover:bg-stone-50 active:scale-[0.97] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
            compact
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition-all duration-200 hover:bg-stone-50 active:scale-[0.97] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                />
              }
            >
              Sort: {sortLabel}
              <IconChevronDown className="size-3.5 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-36 border-stone-200 dark:border-stone-800"
            >
              <DropdownMenuItem onClick={() => setSortLabel("Recent")}>
                Recent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortLabel("Name A–Z")}>
                Name A–Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortLabel("Name Z–A")}>
                Name Z–A
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortLabel("Size")}>
                Size
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortLabel("Type")}>
                Type
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right group — View toggle */}
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
            className="h-9 min-w-9 rounded-lg border-stone-200 shadow-sm transition-all duration-200 data-pressed:bg-indigo-600 data-pressed:text-white data-pressed:shadow-sm dark:border-stone-700 dark:data-pressed:bg-indigo-500"
          >
            <IconLayoutGrid className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label="List view"
            className="h-9 min-w-9 rounded-lg border-stone-200 shadow-sm transition-all duration-200 data-pressed:bg-indigo-600 data-pressed:text-white data-pressed:shadow-sm dark:border-stone-700 dark:data-pressed:bg-indigo-500"
          >
            <IconList className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
