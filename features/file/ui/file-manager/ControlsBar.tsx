"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  IconChevronDown,
  IconLayoutGrid,
  IconList,
} from "@tabler/icons-react";

import { useShallow } from "zustand/react/shallow";
import { useSelectionStore } from "@/features/selection/selection.store";
import { useSettingsStore } from "@/features/settings/settings.store";
import { DownloadButton } from "@/features/download/ui/DownloadButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

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
  const defaultViewMode = useSettingsStore((state) => {
    const candidate = state.values.default_view_mode;
    return candidate === "list" ? "list" : "grid";
  });
  const [viewMode, setViewMode] = useState<FileViewMode>(defaultViewMode);
  const [layoutMode, setLayoutMode] = useState<FileLayoutMode>("separated");

  useEffect(() => {
    setViewMode(defaultViewMode);
  }, [defaultViewMode]);

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
  const compactModeEnabled = useSettingsStore((state) => {
    const candidate = state.values.compact_mode;
    return typeof candidate === "boolean" ? candidate : false;
  });
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

      <div className={cn("flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6 xl:px-8", compactModeEnabled ? "py-2" : "py-3")}>
        {/* Left group — Downloads + Sort */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <DownloadButton
            className={cn(
              "gap-1.5 rounded-lg border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-muted active:scale-[0.97]",
              compactModeEnabled ? "h-8 px-2.5" : "h-9 px-3",
            )}
            compact
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5 rounded-lg border-border bg-card text-xs font-medium text-foreground shadow-sm transition-all duration-200 hover:bg-muted active:scale-[0.97]",
                    compactModeEnabled ? "h-8 px-2.5" : "h-9 px-3",
                  )}
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
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={isSelectionMode ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "rounded-lg font-medium shadow-sm transition-all duration-200 active:scale-[0.97]",
              compactModeEnabled ? "h-8 px-2.5 text-xs" : "h-9",
            )}
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
            className={cn(
              "rounded-lg border-border shadow-sm transition-all duration-200 data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:shadow-sm",
              compactModeEnabled ? "h-8 min-w-8" : "h-9 min-w-9",
            )}
          >
            <IconLayoutGrid className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label="List view"
            className={cn(
              "rounded-lg border-border shadow-sm transition-all duration-200 data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:shadow-sm",
              compactModeEnabled ? "h-8 min-w-8" : "h-9 min-w-9",
            )}
          >
            <IconList className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
