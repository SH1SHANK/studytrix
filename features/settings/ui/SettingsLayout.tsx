"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getAllCategories, getCategoryItems } from "@/features/settings/settings.registry";
import { exportSettings, importSettings } from "@/features/settings/settings.service";
import { useSettingsStore } from "@/features/settings/settings.store";
import type { SettingItem } from "@/features/settings/settings.types";
import { useSettingsSearch } from "@/ui/hooks/useSettings";
import {
  IconSearch,
  IconDownload,
  IconUpload,
  IconRotate,
  IconChevronDown,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useSetting } from "@/ui/hooks/useSettings";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { SettingsCategory } from "./SettingsCategory";

interface CategoryGroup {
  category: string;
  items: SettingItem[];
}

function formatCategoryName(category: string): string {
  return category.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function getCategoryDomId(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function groupByCategory(items: SettingItem[]): CategoryGroup[] {
  const grouped = new Map<string, SettingItem[]>();

  for (const item of items) {
    const existing = grouped.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(item.category, [item]);
    }
  }

  return Array.from(grouped.entries()).map(([category, categoryItems]) => ({
    category,
    items: categoryItems,
  }));
}

export function SettingsLayout() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [compactMode] = useSetting("compact_mode");
  const isCompact = compactMode === true;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const initialize = useSettingsStore((state) => state.initialize);
  const initialized = useSettingsStore((state) => state.initialized);
  const reset = useSettingsStore((state) => state.reset);

  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  const searchedItems = useSettingsSearch(query);

  const categoryGroups = useMemo(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return getAllCategories().map((category) => ({
        category,
        items: getCategoryItems(category),
      }));
    }

    return groupByCategory(searchedItems);
  }, [query, searchedItems]);

  // Track active category via IntersectionObserver
  useEffect(() => {
    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-category");
            if (id) setActiveCategory(id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    observerRef.current = observer;

    // Observe after a tick to let DOM render
    requestAnimationFrame(() => {
      const sections = document.querySelectorAll("[data-category]");
      sections.forEach((el) => observer.observe(el));
    });

    return () => observer.disconnect();
  }, [categoryGroups]);

  // Auto dismiss feedback
  useEffect(() => {
    if (!status && !error) return;
    const timer = setTimeout(() => {
      setStatus(null);
      setError(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [status, error]);

  const handleExport = useCallback(async () => {
    try {
      const json = await exportSettings();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `settings-export-${Date.now()}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);

      setStatus("Settings exported");
      setError(null);
    } catch {
      setError("Failed to export settings");
      setStatus(null);
    }
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const json = await file.text();
      await importSettings(json);
      await initialize();

      setStatus("Settings imported");
      setError(null);
    } catch {
      setError("Failed to import settings");
      setStatus(null);
    }
  }, [initialize]);

  const handleAction = useCallback(async (id: string) => {
    if (id === "semantic_search_rebuild_index") {
      try {
        const intelligenceStore = await import("@/features/intelligence/intelligence.store");
        const intelligenceClient = await import("@/features/intelligence/intelligence.client");
        const customFoldersStore = await import("@/features/custom-folders/custom-folders.store");
        const { DEFAULT_MODEL_ID } = await import("@/features/intelligence/intelligence.constants");

        const snapshotKey = intelligenceClient.buildIntelligenceSnapshotKey("library", DEFAULT_MODEL_ID);
        const customFolders = customFoldersStore.useCustomFoldersStore.getState().folders;
        await intelligenceStore.useIntelligenceStore.getState().clearIntelligenceCache();
        await intelligenceStore.useIntelligenceStore.getState().initialize({
          modelId: DEFAULT_MODEL_ID,
          snapshotKey,
          customFolders,
        });

        setStatus("Search index rebuilt");
        setError(null);
      } catch {
        setError("Failed to rebuild search index");
        setStatus(null);
      }
      return;
    }

    if (id === "personal_repository") {
      const settingsStore = useSettingsStore.getState();
      if (settingsStore.values.personal_repository_visible !== true) {
        settingsStore.setValue("personal_repository_visible", true);
      }
      router.push("/?repo=personal");
      setStatus("Personal Repository opened");
      setError(null);
      return;
    }
  }, [router]);

  const handleDangerAction = useCallback(async (id: string) => {
    if (id === "personal_repository_clear_all") {
      try {
        const customFoldersStore = await import("@/features/custom-folders/custom-folders.store");
        const customFoldersTabsStore = await import("@/features/custom-folders/custom-folders.tabs.store");

        customFoldersStore.useCustomFoldersStore.getState().clearAllFolders();
        customFoldersTabsStore.useCustomFoldersTabsStore.getState().setActivePage("global");

        if (useSettingsStore.getState().values.semantic_search_enabled === true) {
          const intelligenceStore = await import("@/features/intelligence/intelligence.store");
          const intelligenceClient = await import("@/features/intelligence/intelligence.client");
          const { DEFAULT_MODEL_ID } = await import("@/features/intelligence/intelligence.constants");

          const snapshotKey = intelligenceClient.buildIntelligenceSnapshotKey("library", DEFAULT_MODEL_ID);
          await intelligenceStore.useIntelligenceStore.getState().clearIntelligenceCache();
          await intelligenceStore.useIntelligenceStore.getState().initialize({
            modelId: DEFAULT_MODEL_ID,
            snapshotKey,
            customFolders: [],
          });
        }

        setStatus("All Personal Repository folders deleted");
        setError(null);
      } catch {
        setError("Failed to delete Personal Repository folders");
        setStatus(null);
      }
      return;
    }

    if (id === "semantic_search_clear_index") {
      try {
        const intelligenceStore = await import("@/features/intelligence/intelligence.store");

        await intelligenceStore.useIntelligenceStore.getState().clearIntelligenceCache();

        setStatus("Search index cleared");
        setError(null);
      } catch {
        setError("Failed to clear search index");
        setStatus(null);
      }
      return;
    }

    if (id === "semantic_search_remove_model") {
      try {
        const intelligenceClient = await import("@/features/intelligence/intelligence.client");
        const intelligenceStore = await import("@/features/intelligence/intelligence.store");
        const settingsStore = await import("@/features/settings/settings.store");
        await intelligenceClient.getIntelligenceClient().clearModelCache().catch(() => undefined);
        intelligenceStore.useIntelligenceStore.getState().setModelDownloaded(false);
        await intelligenceStore.useIntelligenceStore.getState().deactivateRuntime();
        settingsStore.useSettingsStore.getState().setValue("semantic_search_enabled", false);

        setStatus("Smart Search model removed");
        setError(null);
      } catch {
        setError("Failed to remove model");
        setStatus(null);
      }
      return;
    }

    if (id === "clear_offline_storage") {
      try {
        const offline = await import("@/features/offline/offline.db");
        const offlineIndex = await import("@/features/offline/offline.index.store");
        await Promise.all([
          offline.clearFiles(),
          offline.clearSearchIndex(),
          offline.clearMetadata(),
        ]);
        await offlineIndex.useOfflineIndexStore.getState().hydrate();

        setStatus("Offline storage cleared");
        setError(null);
      } catch {
        setError("Failed to clear offline storage");
        setStatus(null);
      }
      return;
    }

  }, []);

  const scrollToCategory = useCallback((category: string) => {
    document
      .getElementById(`category-${getCategoryDomId(category)}`)
      ?.scrollIntoView({ behavior: "smooth" });
    setShowMobileNav(false);
  }, []);

  return (
    <div className={cn("mx-auto w-full max-w-3xl", isCompact ? "pb-20" : "pb-24")}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className={cn(isCompact ? "mb-6 space-y-3" : "mb-8 space-y-4")}>
        {/* Search */}
        <div className="relative">
          <IconSearch
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80"
            aria-hidden="true"
          />
          <Input
            id="settings-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search settings..."
            className={cn(
              "rounded-xl border-border bg-muted/50 pl-10 border-none shadow-sm focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-muted",
              isCompact ? "h-10 text-sm" : "h-11 text-[15px]",
            )}
          />
        </div>

        {/* ── Mobile Quick Nav ─────────────────────────────── */}
        <div className="md:hidden">
          <button
            onClick={() => setShowMobileNav((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border border-border/40 bg-card px-4 text-[15px] font-medium text-foreground/80",
              isCompact ? "py-2.5 text-sm" : "py-3",
            )}
          >
            <span>
              {activeCategory ? formatCategoryName(activeCategory) : "Jump to section"}
            </span>
            <IconChevronDown className={cn("size-4 transition-transform text-muted-foreground", showMobileNav && "rotate-180")} />
          </button>
          {showMobileNav && (
            <div className="mt-1.5 rounded-xl border border-border/40 bg-card shadow-lg overflow-hidden">
              {categoryGroups.map((group) => {
                if (group.items.length === 0) return null;
                return (
                  <button
                    key={group.category}
                    onClick={() => scrollToCategory(group.category)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 text-left text-[14px] transition-colors",
                      "border-b border-border/40 last:border-0",
                      activeCategory === group.category
                        ? "bg-accent/50 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent/30 hover:text-foreground",
                    )}
                  >
                    {formatCategoryName(group.category)}
                    <span className="text-xs text-muted-foreground/70">{group.items.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Desktop Sidebar Nav (hidden on mobile) ──────── */}
        <nav className={cn("hidden items-start gap-6 md:flex", isCompact ? "pt-2.5" : "pt-4")}>
          <div className="flex flex-wrap gap-2">
            {categoryGroups.map((group) => {
              if (group.items.length === 0) return null;
              return (
                <button
                  key={group.category}
                  onClick={() => scrollToCategory(group.category)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-[14px] font-medium transition-colors border outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    activeCategory === group.category
                      ? "bg-foreground text-background border-transparent"
                      : "bg-transparent text-muted-foreground hover:bg-muted/60 border-border/60",
                  )}
                >
                  {formatCategoryName(group.category)}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="rounded-xl border border-border/50 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          Manage repository behavior, Smart Search, and app defaults from one place.
        </div>

        {/* Feedback banners */}
        {status && (
          <Alert className="animate-in fade-in slide-in-from-top-1 border-primary/20 bg-primary/5">
            <AlertDescription className="text-primary">{status}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1 border-rose-500/20 bg-rose-500/5">
            <AlertDescription className="text-rose-600 dark:text-rose-400">{error}</AlertDescription>
          </Alert>
        )}
      </header>

      {/* ── Categories ─────────────────────────────────────── */}
      <main className={cn(isCompact ? "space-y-6" : "space-y-8")}>
        {categoryGroups.map((group) => {
          if (group.items.length === 0) return null;

          return (
            <div
              key={group.category}
              id={`category-${getCategoryDomId(group.category)}`}
              data-category={group.category}
              className="scroll-mt-28"
            >
              <SettingsCategory
                category={group.category}
                items={group.items}
                onAction={handleAction}
                onDangerAction={handleDangerAction}
              />
            </div>
          );
        })}
      </main>

      {/* ── Data Management Footer ─────────────────────────── */}
      <footer className={cn("space-y-4 border-t border-border/40", isCompact ? "mt-10 pt-6" : "mt-12 pt-8")}>
        <h3 className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground pl-1 sm:pl-4">
          Data Management
        </h3>
        <div className="flex flex-wrap gap-3 sm:px-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleExport()}
            className="h-10 gap-2 rounded-xl text-sm"
          >
            <IconDownload className="size-4" />
            Export Settings
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleImportClick}
            className="h-10 gap-2 rounded-xl text-sm"
          >
            <IconUpload className="size-4" />
            Import Settings
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-10 gap-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 ml-auto"
                >
                  <IconRotate className="size-4" />
                  Reset Defaults
                </Button>
              }
            />
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                <AlertDialogDescription>This will restore local settings to default values. Your data and files will not be affected.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" className="rounded-xl" onClick={() => reset()}>Reset Everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Input ref={fileInputRef} type="file" accept="application/json" onChange={(event) => void handleImportFile(event)} className="hidden" />
      </footer>
    </div>
  );
}
