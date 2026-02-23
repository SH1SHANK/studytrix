import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "What's New in Offline Mode v3",
  description:
    "Overview of reliability and speed improvements in Studytrix Offline Mode v3.",
  alternates: {
    canonical: "/blog/offline-v3",
  },
};

export default function OfflineV3Page() {
  return (
    <AppShell headerTitle="Blog" hideHeaderFilters={true}>
      <article className="px-4 py-5 sm:px-5">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>February 20, 2026</span>
            <span aria-hidden="true">·</span>
            <Badge variant="outline" className="border-border/70 bg-muted/40">Update</Badge>
            <span aria-hidden="true">·</span>
            <span>4 min read</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            What&apos;s New in Offline Mode v3
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Offline Mode v3 is a ground-up rebuild of how Studytrix stores and retrieves files when
            you don't have an internet connection. Here's everything that changed.
          </p>
        </header>

        <section className="mt-4 space-y-5 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <section>
            <h2 className="text-base font-semibold text-foreground">Why We Rebuilt Offline Mode</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The previous offline system worked well for small libraries, but users with hundreds of files
              reported slow save times, occasional sync conflicts, and storage that grew unpredictably.
              v3 addresses all three problems with a new storage layer, smarter caching, and better
              progress tracking.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Key Improvements</h2>
            <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li className="list-disc">
                <strong>IndexedDB storage backend</strong> — Files are stored in a structured IndexedDB database
                with file-level granularity. This replaces the previous bulk blob approach and enables faster
                individual file access.
              </li>
              <li className="list-disc">
                <strong>Streaming downloads</strong> — Large files are downloaded using a streaming fetch pipeline
                instead of loading the entire file into memory first. This reduces peak memory usage by up to 60%.
              </li>
              <li className="list-disc">
                <strong>Group-based organisation</strong> — When you save a folder offline, files are grouped under
                that folder's ID. This lets you manage and remove entire folders at once rather than
                file-by-file.
              </li>
              <li className="list-disc">
                <strong>Last-accessed tracking</strong> — Each offline file tracks when it was last opened. This
                data feeds into future features like automatic eviction of rarely-used files when storage runs low.
              </li>
              <li className="list-disc">
                <strong>Progress for everything</strong> — Downloads, folder expansions, and ZIP exports all show
                real-time progress with file counts and estimated completion.
              </li>
              <li className="list-disc">
                <strong>Download risk gate</strong> — Before any large download, Studytrix shows you the total size
                and asks for confirmation. This prevents accidental downloads of entire folders when you're on
                mobile data.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Storage Limits</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Browser storage is generous but not unlimited. Most modern browsers allocate at least 1 GB of
              storage per origin, often much more. Studytrix shows your current storage usage in
              Settings and will warn you before you exceed 80% of the available quota.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Migration</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              If you had files saved offline with the previous version, they are migrated automatically
              the first time you open Studytrix after the update. No action required — your files will
              be available as before.
            </p>
          </section>

          <aside className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-foreground">
            <p>
              To save a file or folder offline, open the action menu and select
              <strong> Make Available Offline</strong>.
            </p>
          </aside>
        </section>

        <nav className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-3 py-3 text-sm">
          <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
            ← All articles
          </Link>
          <Link href="/blog/organise-files" className="font-medium text-primary transition-colors hover:text-primary/80">
            Next: 5 Ways to Organise Your Files →
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
