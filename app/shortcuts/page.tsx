import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";

type ShortcutItem = {
  keys: string[];
  description: string;
};

type ShortcutGroup = {
  title: string;
  items: ShortcutItem[];
};

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    items: [
      { keys: ["⌘", "K"], description: "Open/close Command Center (Ctrl+K on Windows/Linux)." },
      { keys: ["Esc"], description: "Close dialogs and clear active command state progressively." },
      { keys: ["↑", "↓"], description: "Navigate results in command list." },
      { keys: ["Enter"], description: "Execute/open selected command result." },
    ],
  },
  {
    title: "Command Scope Prefixes",
    items: [
      { keys: ["/"], description: "Open folder scope picker." },
      { keys: ["#"], description: "Open tag scope picker." },
      { keys: [":"], description: "Open department/semester scope picker." },
      { keys: [">"], description: "Switch command mode to actions scope." },
      { keys: ["@"], description: "Switch command mode to recents scope." },
    ],
  },
  {
    title: "Advanced Command Navigation",
    items: [
      { keys: ["Ctrl", "N"], description: "Move to next result." },
      { keys: ["Ctrl", "P"], description: "Move to previous result." },
      { keys: ["Alt", "↓"], description: "Jump to next result group." },
      { keys: ["Alt", "↑"], description: "Jump to previous result group." },
      { keys: ["Ctrl", "Shift", "?"], description: "Re-enter last scoped search context." },
    ],
  },
];

export default function ShortcutsPage() {
  return (
    <AppShell headerTitle="Shortcut Hints" hideHeaderFilters={true}>
      <div className="px-4 py-5 sm:px-5">
        <section className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Shortcut Hints
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keyboard and quick-input hints to navigate Studytrix faster.
          </p>
        </section>

        <section className="mt-4 space-y-3">
          {SHORTCUT_GROUPS.map((group) => (
            <Card key={group.title} className="rounded-2xl border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  {group.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li
                      key={`${group.title}-${item.description}`}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
                    >
                      <span className="text-sm text-foreground/90">{item.description}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {item.keys.map((key) => (
                          <Kbd key={`${group.title}-${item.description}-${key}`}>{key}</Kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
