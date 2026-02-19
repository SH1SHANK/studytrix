"use client";

import { memo, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsItemRenderer } from "./SettingsItemRenderer";
import type { SettingItem } from "@/features/settings/settings.types";

interface SettingsCategoryProps {
  category: string;
  items: SettingItem[];
  onAction?: (id: string) => Promise<void> | void;
  onDangerAction?: (id: string) => Promise<void> | void;
}

function formatCategoryName(category: string): string {
  return category.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function SettingsCategoryComponent({
  category,
  items,
  onAction,
  onDangerAction,
}: SettingsCategoryProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const basicItems = useMemo(
    () => items.filter((item) => !item.advanced),
    [items],
  );

  const advancedItems = useMemo(
    () => items.filter((item) => item.advanced),
    [items],
  );
  const displayName = formatCategoryName(category);
  const totalCount = basicItems.length + advancedItems.length;

  return (
    <section aria-labelledby={`settings-category-${category}`} className="space-y-3">
      <header className="px-1">
        <h2
          id={`settings-category-${category}`}
          className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          {displayName}
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {totalCount} {totalCount === 1 ? "setting" : "settings"}
        </p>
      </header>

      <Card className="rounded-2xl border border-stone-200/80 bg-white/90 shadow-sm dark:border-stone-700/80 dark:bg-stone-900/80 overflow-hidden">
        <CardContent className="p-0 px-4 sm:px-5">
          <div className="flex flex-col">
            {basicItems.map((item) => (
              <SettingsItemRenderer
                key={item.id}
                setting={item}
                onAction={onAction}
                onDangerAction={onDangerAction}
              />
            ))}
          </div>

          {advancedItems.length > 0 ? (
            <div className="flex flex-col border-t border-stone-200/80 dark:border-stone-700/80 bg-stone-50/50 dark:bg-stone-900/40">
              <div className="flex items-center justify-between py-3 border-b border-stone-200/60 dark:border-stone-700/60">
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Advanced Options</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced((current) => !current)}
                  aria-expanded={showAdvanced}
                  aria-controls={`advanced-settings-${category}`}
                  className="rounded-lg h-8 px-3 text-xs"
                >
                  {showAdvanced ? "Hide" : "Reveal"}
                </Button>
              </div>

              <div
                id={`advanced-settings-${category}`}
                hidden={!showAdvanced}
                data-transition="smooth"
                className="flex flex-col"
              >
                {advancedItems.map((item) => (
                  <SettingsItemRenderer
                    key={item.id}
                    setting={item}
                    onAction={onAction}
                    onDangerAction={onDangerAction}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export const SettingsCategory = memo(SettingsCategoryComponent);

export default SettingsCategory;
