import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "5 Ways to Organise Your Study Files",
  description:
    "Practical workflow tips to keep your study library clean, scannable, and search-friendly.",
  alternates: {
    canonical: "/blog/organise-files",
  },
};

export default function OrganiseFilesPage() {
  return (
    <AppShell headerTitle="Blog" hideHeaderFilters={true}>
      <article className="px-4 py-5 sm:px-5">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>February 18, 2026</span>
            <span aria-hidden="true">·</span>
            <Badge variant="outline" className="border-border/70 bg-muted/40">Guide</Badge>
            <span aria-hidden="true">·</span>
            <span>3 min read</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            5 Ways to Organise Your Study Files
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            A tidy file library saves you time every day. These five workflow tweaks will make your
            folders cleaner, easier to scan, and faster to search.
          </p>
        </header>

        <section className="mt-4 space-y-5 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Use a Consistent Naming Convention</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Pick a naming pattern and stick with it. A simple format like
              <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">Subject - Topic - Date</code> (e.g.
              "Biology - Cell Division - Jan 15") makes files sortable and searchable. Avoid generic names
              like "Notes" or "Untitled" — they become invisible in a large library.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Create Folders by Subject, Not by Date</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              When revising for exams, you search by topic, not by "what I uploaded last Tuesday." Structure
              your top-level folders by subject (Math, Physics, History) and use subfolders for units or chapters.
              This mirrors how your brain organises knowledge.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Tag Files for Cross-Cutting Topics</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Some files belong in multiple contexts. A handout on "Statistics in Biology" could live in either
              folder. Instead of duplicating it, keep it in one place and tag it with both subjects. Studytrix's
              tag system lets you browse by tag from the Command Center, so cross-referenced files stay
              easily accessible.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Star Your Most Important Files</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Starring a file pins it for quick access. Use stars for your current study set — the files you're
              actively reviewing this week. When the exam is over, unstar them and star the next batch. This
              keeps your "focus zone" small and relevant.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Let Smart Search Do the Heavy Lifting</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Even with perfect organisation, your library will grow faster than you can browse it. Enable
              Smart Search (Settings → Intelligence) and let the AI find files by meaning. A search for
              "energy transfer in ecosystems" will surface relevant files even if they're titled differently.
              This way, you focus on learning and let the search handle discovery.
            </p>
          </section>

          <aside className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-foreground">
            <p>
              <strong>Quick tip:</strong> You can assign tags to multiple files at once by selecting them in
              the file manager and using the floating toolbar.
            </p>
          </aside>
        </section>

        <nav className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-3 py-3 text-sm">
          <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
            ← All articles
          </Link>
          <Link href="/blog/theme-system" className="font-medium text-primary transition-colors hover:text-primary/80">
            Next: Understanding the Theme System →
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
