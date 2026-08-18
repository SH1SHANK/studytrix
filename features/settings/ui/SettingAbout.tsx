import { ShieldCheck, HardDrive } from "lucide-react";

export function SettingAbout() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">Studytrix</h4>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              v0.9.4
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Personal, local-first offline study library & organizer.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
        <div className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-background/40 p-3">
          <ShieldCheck className="size-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h5 className="text-xs font-semibold text-foreground">Local-First & Private</h5>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              All workspace structures, notes, and indexes stay on this device. No tracking or accounts required.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-background/40 p-3">
          <HardDrive className="size-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h5 className="text-xs font-semibold text-foreground">Offline Ready</h5>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Cached files and study materials remain fully accessible without an active internet connection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
