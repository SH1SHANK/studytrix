import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

const PUBLISHED_DATE = "February 20, 2026";

export const metadata: Metadata = {
  title: "Never Lose Access: What's New in Offline Mode v3",
  description:
    "Overview of reliability, speed, and storage improvements in Studytrix Offline Mode v3.",
  alternates: {
    canonical: "/blog/offline-v3",
  },
};

export default function OfflineV3Page() {
  return (
    <AppShell headerTitle="Blog" hideHeaderFilters={true}>
      <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <time dateTime="2026-02-20">{PUBLISHED_DATE}</time>
            <span aria-hidden="true">·</span>
            <Badge
              variant="outline"
              className="border-border/70 bg-muted/40 text-xs"
            >
              Product Update
            </Badge>
            <span aria-hidden="true">·</span>
            <span>5 min read</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Never Lose Access: What&apos;s New in Offline Mode v3
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Whether you're studying on the subway, stuck in a lecture hall with
            spotty Wi-Fi, or simply want to save mobile data, Offline Mode is a
            lifeline. With version 3, we've completely rebuilt how Studytrix
            stores your files locally to make it faster, safer, and much more
            predictable.
          </p>
        </header>

        <div className="mt-8 space-y-8 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Why We Tore It Down and Rebuilt It
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              The previous offline system worked great if you only had a handful
              of PDFs. But as our community grew, so did your study libraries.
              Users with hundreds of files started reporting slow save times,
              occasional sync conflicts, and browser storage that seemed to grow
              unpredictably.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We realized patches wouldn't cut it. v3 is a ground-up rewrite
              featuring a new storage engine, smarter memory management, and
              highly requested transparency features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Under the Hood: Key Improvements
            </h2>

            <div className="mt-5 space-y-6">
              <div>
                <h3 className="flex items-center gap-2 font-medium text-foreground">
                  <span>🗄️</span> The New Filing Cabinet (IndexedDB)
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Files are now stored in a structured database (IndexedDB) with
                  file-level granularity. This replaces our old "bulk blob"
                  approach. Imagine moving from a single massive chest where all
                  your papers are tossed in, to a perfectly organized filing
                  cabinet. The result? Instant file access, even with thousands
                  of documents.
                </p>
                <div className="my-5 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4 text-center"></div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 font-medium text-foreground">
                  <span>🌊</span> Streaming Downloads
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Previously, downloading a massive lecture video meant the app
                  had to load the entire file into your phone's active memory
                  before saving it. Now, Studytrix uses a{" "}
                  <em>streaming fetch pipeline</em>. It saves the file piece by
                  piece as it arrives. This single change{" "}
                  <strong>reduces peak memory usage by up to 60%</strong>,
                  preventing older devices from crashing during large downloads.
                </p>
                <div className="my-5 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4 text-center"></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <h4 className="font-medium text-foreground">
                    📁 Group-Based Organization
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    When you save a folder offline, files are grouped together
                    under that folder's ID. You can now manage, update, or
                    delete entire subjects at once instead of hunting down
                    individual files.
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <h4 className="font-medium text-foreground">
                    🕒 Smart Eviction Tracking
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Each offline file now tracks when it was last opened. In
                    future updates, this will allow Studytrix to automatically
                    clear out notes you haven't looked at in months when your
                    device runs low on space.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-border/60" />

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              No More Guessing: Complete Transparency
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              You should always know exactly what your app is doing, especially
              when it involves your data plan.
            </p>
            <ul className="mt-4 space-y-3 pl-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <li className="flex gap-3">
                <span className="mt-0.5 text-primary">📊</span>
                <div>
                  <strong className="text-foreground">Live Progress:</strong>{" "}
                  Downloads, folder expansions, and ZIP exports all feature
                  real-time progress bars showing exactly how many files are
                  left and estimated completion times.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 text-primary">🚦</span>
                <div>
                  <strong className="text-foreground">
                    Download Risk Gates:
                  </strong>{" "}
                  Before any massive download begins, Studytrix halts and shows
                  you the total payload size. You have to confirm it, protecting
                  you from accidentally downloading a 4GB folder while on
                  cellular data.
                </div>
              </li>
            </ul>

            <div className="my-6 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4 text-center"></div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Seamless Migration
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              If you already have files saved offline from the previous version,{" "}
              <strong>you don't need to do a thing.</strong>
              The moment you open Studytrix after the update, a silent
              background worker will safely migrate your old files into the new
              IndexedDB system. Your notes will be right where you left them,
              just a whole lot faster.
            </p>
          </section>

          <aside className="mt-8 flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Try it out</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                To save any file or folder for offline use, open the action menu
                (•••) and select <strong>Make Available Offline</strong>.
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm">
              <span aria-hidden="true" className="mr-2">
                ☁️
              </span>
              Works without Wi-Fi
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
            href="/blog/organise-files"
            className="flex items-center font-medium text-primary transition-colors hover:text-primary/80"
          >
            Next: 5 Ways to Organise Your Files
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
