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
import { IconSearch } from "@tabler/icons-react";
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
import { Label } from "@/components/ui/label";

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
  const [disableGlass] = useSetting("disable_glass_effects");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  return (
    <div className="flex flex-col md:flex-row gap-8 pb-36 max-w-[1200px] mx-auto w-full relative">
      <aside className="w-full md:w-[260px] shrink-0 space-y-6 md:sticky md:top-24 md:h-[calc(100vh-8rem)] md:overflow-y-auto no-scrollbar">
        <div className="space-y-1.5 px-1">
          <h1 className="text-[2rem] leading-none font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Settings
          </h1>
          <p className="text-sm leading-snug text-stone-500 dark:text-stone-400">
            Configure behavior and aesthetics.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <IconSearch
              className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-stone-400"
              aria-hidden="true"
            />
            <Input
              id="settings-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              className={cn(
                "h-11 rounded-xl pl-10 text-base md:text-sm border-transparent focus:border-stone-300 dark:focus:border-stone-700",
                disableGlass ? "bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-800" : "bg-stone-100/50 dark:bg-stone-900/50"
              )}
            />
          </div>

          <nav className="hidden md:flex flex-col space-y-1 mt-6">
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Categories</h3>
            {categoryGroups.map((group) => {
              if (group.items.length === 0) return null;
              return (
                <a
                  key={group.category}
                  href={`#category-${group.category}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`category-${group.category}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-3 py-2 text-sm font-medium rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100/50 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800/50 transition-colors"
                >
                  {formatCategoryName(group.category)}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-stone-200/60 dark:border-stone-700/60 space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void handleExport()} className="flex-1 h-9 bg-white/50 dark:bg-stone-900/50">
                Export
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handleImportClick} className="flex-1 h-9 bg-white/50 dark:bg-stone-900/50">
                Import
              </Button>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button type="button" size="sm" variant="ghost" className="h-9 w-full text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30">
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
          
          {status && <Alert><AlertDescription>{status}</AlertDescription></Alert>}
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
      </aside>

      <main data-transition="smooth" className="flex-1 space-y-14 mt-4 md:mt-0 max-w-3xl">
        {categoryGroups.map((group) => {
          if (group.items.length === 0) return null;

          const displayCategory = formatCategoryName(group.category);
          const isHeavy = HEAVY_CATEGORIES.has(group.category);
          const isLoaded = !isHeavy || loadedHeavyCategories.has(group.category);

          if (!isLoaded) {
            return (
              <div key={group.category} id={`category-${group.category}`} className="scroll-mt-28">
                <Card className="rounded-2xl border border-stone-200/80 bg-stone-50/50 dark:border-stone-700/80 dark:bg-stone-900/30">
                  <CardContent className="space-y-3 p-5 flex flex-col items-center justify-center text-center py-10">
                    <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{displayCategory}</h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs">
                      This category is loaded on demand for better performance.
                    </p>
                    <Button type="button" size="sm" variant="secondary" onClick={() => loadCategory(group.category)} className="mt-2">
                      Load {displayCategory}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          }

          if (isHeavy) {
            return (
              <div key={group.category} id={`category-${group.category}`} className="scroll-mt-28">
                <Suspense
                  fallback={(
                    <Card className="rounded-2xl border border-stone-200/80 bg-white/90 dark:border-stone-700/80 dark:bg-stone-900/80">
                      <CardContent className="p-5 flex justify-center text-sm text-stone-500">
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
            <div key={group.category} id={`category-${group.category}`} className="scroll-mt-28">
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
    </div>
  );
}
