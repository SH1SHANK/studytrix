import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CHANGELOG_ENTRIES,
  IS_VERSION_DECLARATION_SYNCED,
} from "@/features/changelog/changelog.catalog";
import { APP_VERSION, formatVersionLabel } from "@/features/version/version";

export default function ChangelogPage() {
  return (
    <AppShell headerTitle="Changelog" hideHeaderFilters={true}>
      <div className="px-4 py-5 sm:px-5">
        <section className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Release Notes
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Curated changelog from {formatVersionLabel("0.1.0")} to{" "}
                {formatVersionLabel(APP_VERSION)}.
              </p>
            </div>
            <Badge variant={IS_VERSION_DECLARATION_SYNCED ? "secondary" : "destructive"}>
              Current {formatVersionLabel(APP_VERSION)}
            </Badge>
          </div>
        </section>

        <section className="mt-4 space-y-3">
          {CHANGELOG_ENTRIES.map((entry) => (
            <Card key={entry.version} className="rounded-2xl border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    {formatVersionLabel(entry.version)} · {entry.title}
                  </CardTitle>
                  <span className="text-xs font-medium text-muted-foreground">
                    {entry.releasedOn}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{entry.summary}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  {entry.highlights.map((item) => (
                    <li key={`${entry.version}-${item}`} className="flex items-start gap-2">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary/80" />
                      <span>{item}</span>
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
