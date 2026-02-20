"use client";

import { memo, useMemo, useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SettingsItemRenderer } from "./SettingsItemRenderer";
import type { SettingItem } from "@/features/settings/settings.types";
import { cn } from "@/lib/utils";

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

  return (
    <section aria-labelledby={`settings-category-${category}`} className="space-y-2">
      <header className="px-1">
        <h2
          id={`settings-category-${category}`}
          className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          {displayName}
        </h2>
      </header>

      <Card className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
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
            <div className="flex flex-col border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setShowAdvanced((current) => !current)}
                aria-expanded={showAdvanced}
                aria-controls={`advanced-settings-${category}`}
                className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-stone-500 transition-colors hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
              >
                <span>Advanced ({advancedItems.length})</span>
                <IconChevronDown className={cn("size-4 transition-transform duration-200", showAdvanced && "rotate-180")} />
              </button>

              <div
                id={`advanced-settings-${category}`}
                hidden={!showAdvanced}
                className="flex flex-col border-t border-stone-100 dark:border-stone-800"
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
