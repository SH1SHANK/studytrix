"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  IconChevronDown,
  IconLayoutGrid,
  IconList,
} from "@tabler/icons-react";

import { useShallow } from "zustand/react/shallow";
import { useSelectionStore } from "@/features/selection/selection.store";
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
  const { isSelectionMode, setSelectionMode } = useSelectionStore(
    useShallow((state) => ({
      isSelectionMode: state.isSelectionMode,
      setSelectionMode: state.setSelectionMode,
    }))
  );

  return (
    <div className="sticky top-0 z-20 bg-background">
      {/* Subtle separator */}
      <div className="h-px bg-linear-to-r from-transparent via-border to-transparent" />

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        {/* Left group — Downloads + Sort */}
        <div className="flex items-center gap-2">
          <DownloadButton
            className="h-9 gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-muted active:scale-[0.97]"
            compact
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-muted active:scale-[0.97]"
                />
              }
            >
              Sort: {sortLabel}
              <IconChevronDown className="size-3.5 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-36 border-border"
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
        <div className="flex items-center gap-2">
          <Button
            variant={isSelectionMode ? "secondary" : "outline"}
            size="sm"
            className="h-9 rounded-lg font-medium shadow-sm transition-all duration-200 active:scale-[0.97]"
            onClick={() => setSelectionMode(!isSelectionMode)}
          >
            {isSelectionMode ? "Cancel" : "Select"}
          </Button>

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
            className="h-9 min-w-9 rounded-lg border-border shadow-sm transition-all duration-200 data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:shadow-sm"
          >
            <IconLayoutGrid className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label="List view"
            className="h-9 min-w-9 rounded-lg border-border shadow-sm transition-all duration-200 data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:shadow-sm"
          >
            <IconList className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
