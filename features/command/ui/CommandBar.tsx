"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Folder,
  Plus,
  Settings,
  Moon,
  Sun,
  HardDrive,
  FileText,
  Tag,
  Clock,
} from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useCommandCenterStore } from "@/features/command/command-center.store";
import { searchService, type SearchResultItem } from "@/features/search/search.service";
import { AddWorkspaceDialog } from "@/features/workspace/ui/AddWorkspaceDialog";
import { AddDriveSourceDialog } from "@/features/drive/ui/AddDriveSourceDialog";

interface CommandBarProps {
  placeholder?: string;
  navigationScope?: unknown;
}

export function CommandBar({ placeholder = "Search study library or type a command..." }: CommandBarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isOpen = useCommandCenterStore((state) => state.isOpen);
  const setOpen = useCommandCenterStore((state) => state.setOpen);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [addWorkspaceOpen, setAddWorkspaceOpen] = useState(false);
  const [addSourceOpen, setAddSourceOpen] = useState(false);

  // Shortcut handler for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!isOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  // Query search service
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    searchService.search(query, { limit: 16 }).then((items) => {
      if (isMounted) {
        setResults(items);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, query]);

  const handleSelectItem = (item: SearchResultItem) => {
    setOpen(false);
    router.push(item.url);
  };

  const getResultIcon = (type: SearchResultItem["type"]) => {
    switch (type) {
      case "workspace":
        return <Folder className="size-4 text-primary shrink-0" />;
      case "folder":
        return <Folder className="size-4 text-amber-500 shrink-0" />;
      case "file":
        return <FileText className="size-4 text-sky-500 shrink-0" />;
      case "tag":
        return <Tag className="size-4 text-emerald-500 shrink-0" />;
      case "source":
        return <HardDrive className="size-4 text-indigo-500 shrink-0" />;
    }
  };

  return (
    <>
      <CommandDialog
        open={isOpen}
        onOpenChange={(open) => {
          setOpen(open);
          if (!open) setQuery("");
        }}
        title="Search & Commands"
        description="Search your study library or execute quick actions"
      >
        <CommandInput
          placeholder={placeholder}
          value={query}
          onValueChange={setQuery}
        />

        <CommandList>
          <CommandEmpty>No results found for &quot;{query}&quot;.</CommandEmpty>

          {/* Search Results Group */}
          {results.length > 0 ? (
            <CommandGroup heading={query.trim() ? "Search Results" : "Quick Suggestions"}>
              {results.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.type}-${item.id}-${item.title}`}
                  onSelect={() => handleSelectItem(item)}
                  className="flex items-center gap-2.5"
                >
                  {getResultIcon(item.type)}
                  <div className="flex flex-1 items-center justify-between min-w-0">
                    <span className="truncate font-medium text-xs">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 truncate">
                      {item.subtitle}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          <CommandSeparator />

          {/* Quick Actions Group */}
          <CommandGroup heading="Quick Actions">
            <CommandItem
              value="action-add-workspace"
              onSelect={() => {
                setOpen(false);
                setAddWorkspaceOpen(true);
              }}
              className="gap-2.5 text-xs"
            >
              <Plus className="size-4 text-primary" />
              <span>Create Workspace</span>
            </CommandItem>

            <CommandItem
              value="action-add-source"
              onSelect={() => {
                setOpen(false);
                setAddSourceOpen(true);
              }}
              className="gap-2.5 text-xs"
            >
              <HardDrive className="size-4 text-indigo-500" />
              <span>Connect Google Drive Folder</span>
            </CommandItem>

            <CommandItem
              value="action-recent"
              onSelect={() => {
                setOpen(false);
                router.push("/recent");
              }}
              className="gap-2.5 text-xs"
            >
              <Clock className="size-4 text-emerald-500" />
              <span>Open Recent Files</span>
            </CommandItem>

            <CommandItem
              value="action-all-files"
              onSelect={() => {
                setOpen(false);
                router.push("/files");
              }}
              className="gap-2.5 text-xs"
            >
              <FileText className="size-4 text-sky-500" />
              <span>Browse All Files</span>
            </CommandItem>

            <CommandItem
              value="action-toggle-theme"
              onSelect={() => {
                setTheme(theme === "dark" ? "light" : "dark");
              }}
              className="gap-2.5 text-xs"
            >
              {theme === "dark" ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-violet-500" />
              )}
              <span>Switch Theme</span>
            </CommandItem>

            <CommandItem
              value="action-settings"
              onSelect={() => {
                setOpen(false);
                router.push("/settings");
              }}
              className="gap-2.5 text-xs"
            >
              <Settings className="size-4 text-muted-foreground" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <AddWorkspaceDialog
        open={addWorkspaceOpen}
        onOpenChange={setAddWorkspaceOpen}
      />

      <AddDriveSourceDialog
        open={addSourceOpen}
        onOpenChange={setAddSourceOpen}
      />
    </>
  );
}
