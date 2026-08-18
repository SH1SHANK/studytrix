"use client";

import { Command } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ["⌘", "K"], description: "Open Search & Command Palette" },
  { keys: ["Esc"], description: "Close active modal, drawer, or search bar" },
  { keys: ["Tab"], description: "Navigate between focusable interactive controls" },
  { keys: ["Enter"], description: "Open selected file, folder, or submit form" },
  { keys: ["↑", "↓"], description: "Navigate search results or list options" },
];

export function SettingKeyboardShortcuts() {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2">
        <Command className="size-4 text-primary" />
        <h4 className="text-xs font-semibold text-foreground">
          Keyboard Navigation Reference
        </h4>
      </div>

      <div className="divide-y divide-border/30 rounded-lg border border-border/40 overflow-hidden bg-background/50">
        {SHORTCUTS.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 text-xs">
            <span className="text-muted-foreground">{item.description}</span>
            <div className="flex items-center gap-1">
              {item.keys.map((k, ki) => (
                <kbd
                  key={ki}
                  className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground shadow-2xs"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
