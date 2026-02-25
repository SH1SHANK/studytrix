import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

const PUBLISHED_DATE = "February 23, 2026";

export const metadata: Metadata = {
  title: "How Smart Search Works in Studytrix",
  description:
    "Learn how Studytrix Smart Search uses on-device semantic embeddings to surface relevant files beyond exact keywords.",
  alternates: {
    canonical: "/blog/how-semantic-search-works",
  },
};

export default function HowSemanticSearchWorksPage() {
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
            Beyond the Keyword: How Smart Search Works in Studytrix
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            We've all been there: you're frantically looking for your notes on
            "cellular respiration," but you saved the file as
            "Bio_Midterm_Prep_v2." Traditional search leaves you empty-handed.
            Smart Search fixes this by understanding what you mean, not just
            what you type.
          </p>
        </header>

        <div className="mt-8 space-y-8 rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm sm:p-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground">
              The Problem with "Ctrl+F"
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Traditional keyword search is incredibly fast, but it's incredibly
              literal. It relies on exact string matching. If you search for
              "supply and demand," it looks for those exact letters in that
              exact order. It misses files titled with abbreviations (e.g.,
              "Econ_Ch4_S&D"), synonyms, or broader concepts that don't use your
              exact search terms.
            </p>

            <div className="my-6 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4 text-center"></div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              Enter Semantic Search: A Library of Meaning
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Instead of matching letters, Studytrix's Smart Search matches{" "}
              <strong>ideas</strong>. We achieve this using an advanced AI
              technique called "vector embeddings."
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Imagine a massive 3D map where every concept in the world has its
              own specific coordinate. Words with similar meanings are placed
              right next to each other on this map. "Heart" is placed very close
              to "cardiovascular," and "Newton" is placed near "gravity."
            </p>

            <div className="my-6 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4 text-center"></div>

            <blockquote className="my-5 border-l-4 border-primary pl-4 italic text-foreground/90">
              "When you search, Studytrix isn't looking for matching words; it's
              looking for files that live in the same neighborhood of meaning as
              your query."
            </blockquote>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              What happens the moment you hit "Search"?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              It feels instantaneous, but a highly choreographed process happens
              behind the scenes:
            </p>
            <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <li className="pl-2">
                <strong className="text-foreground">Translation:</strong> Your
                typed query is fed into our embedding model (
                <code>bge-small-en-v1.5</code>) and translated into a numeric
                vector—finding its exact "coordinate" of meaning.
              </li>
              <li className="pl-2">
                <strong className="text-foreground">Scanning the Map:</strong>{" "}
                The app compares your query's coordinate against the coordinates
                of all your stored files and notes.
              </li>
              <li className="pl-2">
                <strong className="text-foreground">
                  Distance Calculation:
                </strong>{" "}
                It calculates the mathematical distance between your search and
                your files. The shorter the distance, the more relevant the
                note.
              </li>
              <li className="pl-2">
                <strong className="text-foreground">Hybrid Blending:</strong>{" "}
                Because exact keywords still matter, Studytrix blends the
                semantic "meaning" score with a traditional keyword score to
                give you the absolute best results at the top of the list.
              </li>
            </ol>
          </section>

          <hr className="border-border/60" />

          <section>
            <h2 className="text-xl font-semibold text-foreground">
              100% On-Device Privacy
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Usually, running AI models like this requires sending your data to
              a cloud server. We knew that wasn't acceptable for your personal
              study materials.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We've engineered the <code>bge-small-en-v1.5</code> model to run{" "}
              <strong>entirely on your local device</strong>. Your search
              queries, your study notes, and the vector coordinates never leave
              your phone or computer. This means zero loading screens waiting on
              slow internet, and complete privacy for your data.
            </p>

            <div className="my-6 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-4 text-center"></div>
          </section>

          <aside className="mt-8 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-foreground">
                Ready to try it out?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Smart Search is currently an experimental feature. You can turn
                it on in your settings today.
              </p>
            </div>
            <Link
              href="/settings/intelligence"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Enable in Settings
            </Link>
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
            href="/blog/cleanup-engine"
            className="flex items-center font-medium text-primary transition-colors hover:text-primary/80"
          >
            Read next: The AI Cleanup Engine
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
