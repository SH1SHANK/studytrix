"use client";

import {
  Suspense,
  lazy,
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
import { IconSearch, IconDownload, IconUpload, IconRotate, IconSettings, IconChevronDown } from "@tabler/icons-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { SettingsCategory } from "./SettingsCategory";

const LazySettingsCategory = lazy(() => import("./SettingsCategory"));

const HEAVY_CATEGORIES = new Set(["Performance", "Danger Zone"]);

interface CategoryGroup {
  category: string;
  items: SettingItem[];
}

function formatCategoryName(category: string): string {
  return category.replace(/([a-z])([A-Z])/g, "$1 $2");
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedHeavyCategories, setLoadedHeavyCategories] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [disableGlass] = useSetting("disable_glass_effects");

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

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    setLoadedHeavyCategories((current) => {
      const next = new Set(current);

      for (const group of categoryGroups) {
        if (HEAVY_CATEGORIES.has(group.category)) {
          next.add(group.category);
        }
      }

      return next;
    });
  }, [categoryGroups, query]);

  const loadCategory = useCallback((category: string) => {
    setLoadedHeavyCategories((current) => {
      if (current.has(category)) {
        return current;
      }

      const next = new Set(current);
      next.add(category);
      return next;
    });
  }, []);

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
    if (id !== "clear_offline_storage") {
      return;
    }

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
  }, []);

  const handleDangerAction = useCallback(async (id: string) => {
    if (id !== "reset_all_settings") {
      return;
    }

    reset();
    setStatus("Settings reset to defaults");
    setError(null);
  }, [reset]);

  const scrollToCategory = useCallback((category: string) => {
    document.getElementById(`category-${category}`)?.scrollIntoView({ behavior: "smooth" });
    setShowMobileNav(false);
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl pb-24">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="space-y-4">
        {/* Search */}
        <div className="relative">
          <IconSearch
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <Input
            id="settings-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search settings..."
            className="h-10 rounded-lg border-stone-200 bg-stone-50 pl-10 text-sm dark:border-stone-800 dark:bg-stone-900"
          />
        </div>

        {/* ── Mobile Quick Nav ─────────────────────────────── */}
        <div className="md:hidden">
          <button
            onClick={() => setShowMobileNav((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
          >
            <span>
              {activeCategory ? formatCategoryName(activeCategory) : "Jump to section"}
            </span>
            <IconChevronDown className={cn("size-4 transition-transform", showMobileNav && "rotate-180")} />
          </button>
          {showMobileNav && (
            <div className="mt-1 rounded-lg border border-stone-200 bg-white shadow-md dark:border-stone-800 dark:bg-stone-900">
              {categoryGroups.map((group) => {
                if (group.items.length === 0) return null;
                return (
                  <button
                    key={group.category}
                    onClick={() => scrollToCategory(group.category)}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors",
                      "border-b border-stone-100 last:border-0 dark:border-stone-800",
                      activeCategory === group.category
                        ? "bg-stone-50 font-medium text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                        : "text-stone-600 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800",
                    )}
                  >
                    {formatCategoryName(group.category)}
                    <span className="text-xs text-stone-400">{group.items.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Desktop Sidebar Nav (hidden on mobile) ──────── */}
        <nav className="hidden items-start gap-6 md:flex">
          <div className="flex flex-wrap gap-1.5">
            {categoryGroups.map((group) => {
              if (group.items.length === 0) return null;
              return (
                <button
                  key={group.category}
                  onClick={() => scrollToCategory(group.category)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    activeCategory === group.category
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700",
                  )}
                >
                  {formatCategoryName(group.category)}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Feedback banners */}
        {status && (
          <Alert className="animate-in fade-in slide-in-from-top-1">
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </header>

      {/* ── Categories ─────────────────────────────────────── */}
      <main className="mt-6 space-y-8">
        {categoryGroups.map((group) => {
          if (group.items.length === 0) return null;

          const displayCategory = formatCategoryName(group.category);
          const isHeavy = HEAVY_CATEGORIES.has(group.category);
          const isLoaded = !isHeavy || loadedHeavyCategories.has(group.category);

          if (!isLoaded) {
            return (
              <div key={group.category} id={`category-${group.category}`} data-category={group.category} className="scroll-mt-28">
                <Card className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
                  <CardContent className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                    <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{displayCategory}</h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      Loaded on demand for better performance.
                    </p>
                    <Button type="button" size="sm" variant="secondary" onClick={() => loadCategory(group.category)}>
                      Load {displayCategory}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          }

          if (isHeavy) {
            return (
              <div key={group.category} id={`category-${group.category}`} data-category={group.category} className="scroll-mt-28">
                <Suspense
                  fallback={(
                    <Card className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
                      <CardContent className="flex justify-center p-5 text-sm text-stone-500">
                        Loading {displayCategory}...
                      </CardContent>
                    </Card>
                  )}
                >
                  <LazySettingsCategory
                    category={group.category}
                    items={group.items}
                    onAction={handleAction}
                    onDangerAction={handleDangerAction}
                  />
                </Suspense>
              </div>
            );
          }

          return (
            <div key={group.category} id={`category-${group.category}`} data-category={group.category} className="scroll-mt-28">
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
      <footer className="mt-10 space-y-3 border-t border-stone-200 pt-6 dark:border-stone-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          Data Management
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void handleExport()}
            className="h-9 gap-1.5 rounded-lg text-xs"
          >
            <IconDownload className="size-3.5" />
            Export
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleImportClick}
            className="h-9 gap-1.5 rounded-lg text-xs"
          >
            <IconUpload className="size-3.5" />
            Import
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 gap-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <IconRotate className="size-3.5" />
                  Reset Defaults
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                <AlertDialogDescription>This will restore local settings to default values.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => reset()}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Input ref={fileInputRef} type="file" accept="application/json" onChange={(event) => void handleImportFile(event)} className="hidden" />
      </footer>
    </div>
  );
}
