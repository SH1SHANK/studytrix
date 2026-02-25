import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

const PUBLISHED_DATE = "February 18, 2026";

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
      <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <time dateTime="2026-02-18">{PUBLISHED_DATE}</time>
            <span aria-hidden="true">·</span>
            <Badge
              variant="outline"
              className="border-border/70 bg-muted/40 text-xs"
            >
              Workflow Guide
            </Badge>
            <span aria-hidden="true">·</span>
            <span>4 min read</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            5 Ways to Organise Your Study Files (and Keep Your Sanity)
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            We've all stared at a folder full of files named "Untitled(3).pdf"
            and "Final_Notes_REAL_v2.docx" the night before an exam. A messy
            digital workspace drains your energy before you even start studying.
            Here are five incredibly simple workflow tweaks to build a library
            that works for you, not against you.
          </p>
        </header>

        <div className="mt-8 space-y-10 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                1
              </span>
              Adopt a Bulletproof Naming Convention
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Your future self will thank you for this. Pick a naming pattern
              and stick with it religiously. Generic names become completely
              invisible in a large library. A simple, predictable format makes
              your files instantly sortable and searchable.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-destructive">
                  Don't Do This
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground line-through opacity-70">
                  <li>history notes.pdf</li>
                  <li>Lecture 4.docx</li>
                  <li>IMG_8472.png</li>
                </ul>
              </div>
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                  Do This
                </div>
                <ul className="space-y-2 font-mono text-xs text-foreground sm:text-sm">
                  <li>Hist101 - WWII - Oct 12.pdf</li>
                  <li>Bio200 - Cell Division.docx</li>
                  <li>Math - Calculus Cheatsheet.png</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                2
              </span>
              Organize by Subject, Not by Time
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              It’s tempting to create folders like "Fall Semester 2025" or
              "October Uploads." But when you're cramming for finals, you search
              by <em>topic</em>, not by the date you downloaded the file.
              Structure your top-level folders by subject (Math, Physics,
              Literature) and use subfolders for specific units. Mirror how your
              brain actually organizes knowledge.
            </p>

            <div className="my-6 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4 text-center">
              [Infographic: A messy timeline-based folder structure transforming
              into a clean, subject-based hierarchy]
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                3
              </span>
              Use Tags for Cross-Cutting Concepts
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              What happens when a file belongs in two places? A paper on "The
              Economics of Climate Change" could live in your Economics folder
              or your Environmental Science folder.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Instead of duplicating the file, pick one home for it and{" "}
              <strong>tag it</strong> with both subjects. Studytrix's tag system
              lets you browse by tag directly from the Command Center, tying
              related concepts together across different folders.
            </p>
          </section>

          <hr className="border-border/60" />

          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                4
              </span>
              Treat "Stars" Like Your Active Desk
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Starring a file pins it for quick access, but if you star
              everything, the feature loses its power. Think of your Starred
              list as your physical desk: only put what you are actively working
              on right now on the desk.
            </p>
            <blockquote className="my-4 border-l-4 border-primary pl-4 italic text-foreground/90">
              Star your current study set for the week. Once the exam is over,
              unstar them to clear your desk for the next batch of work. Keep
              your "focus zone" small and relevant.
            </blockquote>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                5
              </span>
              Let Smart Search Be Your Safety Net
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Even with perfect organization, a massive library will eventually
              outgrow your ability to manually browse it. That's okay. By
              enabling Smart Search (Settings → Intelligence), you let the AI
              find files by their
              <em>meaning</em>. If you misplace a file or forget its exact name,
              your safety net is always there to catch it.
            </p>
          </section>

          <aside className="mt-8 flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center font-semibold text-foreground">
                <span className="mr-2 text-lg">💡</span> Pro Workflow Tip
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Need to tag a bunch of files at once? You can select multiple
                files in the Studytrix file manager and use the floating toolbar
                to apply tags in bulk.
              </p>
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
            href="/blog/theme-system"
            className="flex items-center font-medium text-primary transition-colors hover:text-primary/80"
          >
            Next: Understanding the Theme System
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
