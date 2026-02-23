import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "The Command Center: Your Study Cockpit",
  description:
    "Discover how the Command Center blends keyword search, semantic search, quick actions, and file navigation into one unified interface.",
  alternates: {
    canonical: "/blog/command-center",
  },
};

export default function CommandCenterPage() {
  return (
    <AppShell headerTitle="Blog" hideHeaderFilters={true}>
      <article className="px-4 py-5 sm:px-5">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>February 23, 2026</span>
            <span aria-hidden="true">·</span>
            <Badge variant="outline" className="border-border/70 bg-muted/40">Feature</Badge>
            <span aria-hidden="true">·</span>
            <span>6 min read</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            The Command Center: Your Study Cockpit
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The Command Center is the single most powerful interface in Studytrix. It's where you search, navigate,
            and take action — all without leaving the keyboard. Think of it as a study cockpit that understands
            what you mean, not just what you type.
          </p>
        </header>

        <section className="mt-4 space-y-5 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <section>
            <h2 className="text-base font-semibold text-foreground">More Than a Search Bar</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              At first glance, the Command Center looks like a simple search bar. But beneath the surface,
              it's running two search engines simultaneously, managing an on-device AI model, tracking folder
              and tag scopes, and maintaining a responsive live-result interface — all in real time.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Every keystroke triggers a debounced pipeline that queries your files across multiple dimensions.
              Results appear instantly, ranked by relevance, with highlighted match fragments so you can
              spot the right file at a glance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Dual-Engine Search</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The Command Center runs two search engines in parallel:
            </p>
            <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li className="list-disc">
                <strong>Keyword Search</strong> — Fast, exact-match search across file names, folder paths,
                and tags. This is what runs when Smart Search is off or while the AI model is loading.
              </li>
              <li className="list-disc">
                <strong>Semantic Search</strong> — Uses an on-device AI model (all-MiniLM-L6-v2) to understand
                the <em>meaning</em> behind your query. A search for "photosynthesis" will find a file titled
                "Plant Energy Conversion Notes" even though the words don't overlap.
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Results from both engines are blended together using a configurable balance. By default, semantic
              results are weighted at 60%, but you can adjust this in Settings → Intelligence → Search Balance.
              Moving the slider toward "Keyword" gives you exact-match precision; moving it toward "Meaning"
              gives you conceptual breadth.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Scoped Search</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You can narrow your search to a specific folder or tag. When you enter a scope, the search
              results automatically filter to only include files within that context. This is especially
              useful when you have hundreds of files across multiple subjects and want to focus on a
              particular topic.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Scopes are shown as breadcrumbs in the search bar, and you can exit a scope anytime by
              pressing backspace or tapping the close icon.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Smart Search Status Indicators</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The Command Center keeps you informed about what's happening behind the scenes:
            </p>
            <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li className="list-disc">
                <strong>Warming up…</strong> — The AI model is being loaded for the first time. This
                happens once per session and takes a few seconds.
              </li>
              <li className="list-disc">
                <strong>Learning your files…</strong> — The model is indexing your file library to create
                semantic vectors. This runs in the background and doesn't block searching.
              </li>
              <li className="list-disc">
                <strong>Smart search active</strong> — Everything is ready. Both keyword and semantic
                results will appear.
              </li>
              <li className="list-disc">
                <strong>Keyword fallback</strong> — The semantic engine couldn't run (e.g., model failed to
                load), so results are keyword-only.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">The Sparkle Toggle</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Next to the search input, you'll notice a small sparkle (✦) icon. This is your per-session
              Smart Search toggle. Tapping it turns semantic search on or off for the current session without
              changing your global settings. It's useful when you want exact keyword matches temporarily.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Match Highlighting</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              As you type, matching fragments in file titles and subtitles are highlighted. This makes it
              easy to scan through results and understand <em>why</em> each file appeared. The highlighting
              supports multi-word queries — each word is highlighted independently, so even partial matches
              are visible.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The Command Center isn't limited to search. From any file result, you can access the full
              action menu: download, share, copy link, star, tag, make offline, view info, and — with
              the new Copy Contents feature — extract and copy the file's text content.
            </p>
          </section>

          <aside className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-foreground">
            <p>
              Open the Command Center by tapping the search bar on the floating dock, or by pressing
              <kbd className="mx-1 rounded border border-border/80 bg-muted/60 px-1.5 py-0.5 text-xs font-mono">/</kbd>
              on desktop.
            </p>
          </aside>
        </section>

        <nav className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-3 py-3 text-sm">
          <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
            ← All articles
          </Link>
          <Link href="/blog/how-semantic-search-works" className="font-medium text-primary transition-colors hover:text-primary/80">
            Next: How Smart Search Works →
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
