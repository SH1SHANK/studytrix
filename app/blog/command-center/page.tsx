import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

const PUBLISHED_DATE = "February 23, 2026";

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
      <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <time dateTime="2026-02-23">{PUBLISHED_DATE}</time>
            <span aria-hidden="true">·</span>
            <Badge
              variant="outline"
              className="border-border/70 bg-muted/40 text-xs"
            >
              Feature Deep Dive
            </Badge>
            <span aria-hidden="true">·</span>
            <span>6 min read</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            The Command Center: Your Study Cockpit
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every great workflow needs a home base. The Command Center is the
            single most powerful interface in Studytrix. It's where you search,
            navigate, and take action—all without ever leaving the keyboard.
            Think of it as a high-tech study cockpit that understands what you
            mean, not just what you type.
          </p>
        </header>

        <div className="mt-8 space-y-8 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Way More Than a Search Bar
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              At first glance, the Command Center looks like a simple,
              unassuming search box. But beneath the surface, it's an absolute
              powerhouse. It runs two search engines simultaneously, manages an
              on-device AI model, tracks your folder locations, and maintains a
              lightning-fast live-result interface.
            </p>

            <div className="my-6 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4 text-center"></div>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              As your fingers fly across the keyboard, the Command Center
              instantly queries your files across multiple dimensions. Results
              appear in real-time, perfectly ranked, with your matching words
              highlighted so you can spot the right file at a single glance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Under the Hood: Dual-Engine Search
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Why settle for one way to search when you can have two? The
              Command Center runs two distinct search engines in parallel to
              make sure you never lose a file again:
            </p>

            <ul className="mt-4 space-y-4 pl-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <li className="flex gap-3">
                <span className="mt-0.5 text-primary">🔍</span>
                <div>
                  <strong className="text-foreground">
                    Keyword Search (The Exact Match):
                  </strong>{" "}
                  Fast, literal search across file names, folder paths, and
                  tags. Perfect for when you know exactly what you named a file.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 text-primary">🧠</span>
                <div>
                  <strong className="text-foreground">
                    Semantic Search (The Meaning Match):
                  </strong>{" "}
                  Uses an on-device AI model to understand the <em>concept</em>{" "}
                  behind your query. A search for "photosynthesis" will find a
                  file titled "Plant Energy Conversion Notes," even if the words
                  don't overlap.
                </div>
              </li>
            </ul>

            <div className="my-6 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4 text-center"></div>

            <blockquote className="my-5 border-l-4 border-primary pl-4 italic text-foreground/90">
              <strong>Pro Tip:</strong> You control the mix! Head to Settings →
              Intelligence → Search Balance. Move the slider toward "Keyword"
              for exact-match precision, or toward "Meaning" for conceptual
              breadth.
            </blockquote>
          </section>

          <hr className="border-border/60" />

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Laser Focus with Scoped Search
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              When you have hundreds of files, sometimes you need to block out
              the noise. By entering a "scope" (like a specific folder or tag),
              the Command Center instantly filters results to only include files
              within that context. Searching for "mitosis" inside your "Biology
              101" scope ensures your "History" notes won't clutter the results.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Scopes appear as clean, visual breadcrumbs right inside the search
              bar. Done with a scope? Just hit Backspace to zoom back out to
              your entire library.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              The Magic Sparkle Toggle (✦)
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Next to the search input, you'll notice a small sparkle icon. This
              is your per-session Smart Search toggle. Sometimes you just want a
              strict keyword search without the AI stepping in. Tapping the
              sparkle turns semantic search off (or back on) for your current
              session without messing up your global settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Action Without Distraction
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Finding your file is only half the battle; what you do next
              matters just as much. The Command Center is built for action. From
              any search result, you can instantly:
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center text-foreground">
                ⬇️ Download
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center text-foreground">
                🔗 Share Link
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center text-foreground">
                ⭐ Star Item
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-center text-foreground">
                📋 Copy Content
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              With our new <strong>Copy Contents</strong> feature, you can even
              extract a file's text directly from the search results without
              ever opening the document.
            </p>
          </section>

          <aside className="mt-8 flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-foreground">
                Ready for takeoff?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the Command Center anywhere in the app by tapping the
                floating dock search bar.
              </p>
            </div>
            <div className="flex shrink-0 items-center rounded-lg border border-border/80 bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm">
              Desktop Shortcut:
              <kbd className="ml-2 rounded border border-border/80 bg-muted px-2 py-1 font-mono text-xs text-primary shadow-sm">
                /
              </kbd>
            </div>
          </aside>
        </div>

        <nav className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-border/80 bg-card/70 px-4 py-4 text-sm sm:flex-row sm:px-6">
          <Link
            href="/blog"
            className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden="true" className="mr-2">
              ←
            </span>
            Back to all articles
          </Link>
          <Link
            href="/blog/how-semantic-search-works"
            className="flex items-center font-medium text-primary transition-colors hover:text-primary/80"
          >
            Read next: How Smart Search Works
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
