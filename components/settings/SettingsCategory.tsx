"use client";

import { memo } from "react";

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
  const displayName = formatCategoryName(category);

  return (
    <section aria-labelledby={`settings-category-${category}`} className="space-y-2">
      <header className="px-1 sm:px-4">
        <h2
          id={`settings-category-${category}`}
          className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase"
        >
          {displayName}
        </h2>
      </header>

      <Card className="overflow-hidden rounded-xl border-none bg-accent/40 sm:bg-card shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col">
            {items.map((item) => (
              <SettingsItemRenderer
                key={item.id}
                setting={item}
                onAction={onAction}
                onDangerAction={onDangerAction}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export const SettingsCategory = memo(SettingsCategoryComponent);

export default SettingsCategory;
