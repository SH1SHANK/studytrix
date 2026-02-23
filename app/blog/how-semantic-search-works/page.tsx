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
      <article className="px-4 py-5 sm:px-5">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{PUBLISHED_DATE}</span>
            <span aria-hidden="true">·</span>
            <Badge variant="outline" className="border-border/70 bg-muted/40">Feature</Badge>
            <span aria-hidden="true">·</span>
            <span>4 min read</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            How Smart Search Works in Studytrix
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Smart Search helps you find the right file even when your exact query words do not appear in the title.
            Instead of matching only text, it compares meaning so conceptually related notes can still surface quickly.
          </p>
        </header>

        <section className="mt-4 space-y-4 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <section>
            <h2 className="text-base font-semibold text-foreground">Why keyword search falls short</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Keyword search is fast and useful, but it can miss files when wording changes. A file titled with abbreviations,
              synonyms, or lecture-specific phrasing may not match your typed words even if the content is exactly what you need.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">How the model understands meaning</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Studytrix uses <code>bge-small-en-v1.5</code> to convert both queries and file context into compact numeric vectors.
              Similar ideas end up closer together in this vector space, which is why related files can be found without exact
              word overlap. The model runs entirely on your device.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">What happens when you search</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Your query is converted into a semantic vector.</li>
              <li>Stored file vectors are compared against that query vector.</li>
              <li>Closest matches are ranked by similarity.</li>
              <li>Semantic and keyword rankings are blended for final ordering.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Privacy</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Smart Search runs on-device. Your search query and embeddings stay local, and no search query leaves your phone.
            </p>
          </section>

          <aside className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-foreground">
            <p>
              Smart Search is currently experimental. Enable it in Settings → Intelligence.
              <Link href="/" className="ml-1 font-medium text-primary underline underline-offset-2 hover:text-primary/80">
                Back to app
              </Link>
            </p>
          </aside>
        </section>

        <nav className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-3 py-3 text-sm">
          <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
            ← All articles
          </Link>
          <Link href="/blog/cleanup-engine" className="font-medium text-primary transition-colors hover:text-primary/80">
            Next: AI Cleanup Engine →
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
