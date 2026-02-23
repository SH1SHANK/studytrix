import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Understanding the Theme System",
  description:
    "How Studytrix themes are structured and how visual tokens stay consistent across pages and dialogs.",
  alternates: {
    canonical: "/blog/theme-system",
  },
};

export default function ThemeSystemPage() {
  return (
    <AppShell headerTitle="Blog" hideHeaderFilters={true}>
      <article className="px-4 py-5 sm:px-5">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>February 14, 2026</span>
            <span aria-hidden="true">·</span>
            <Badge variant="outline" className="border-border/70 bg-muted/40">Feature</Badge>
            <span aria-hidden="true">·</span>
            <span>3 min read</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Understanding the Theme System
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Studytrix uses a design token system that ensures every page, dialog, and component looks
            consistent — whether you're in light mode, dark mode, or using a custom accent colour.
          </p>
        </header>

        <section className="mt-4 space-y-5 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <section>
            <h2 className="text-base font-semibold text-foreground">What Are Design Tokens?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Design tokens are named variables that represent visual properties — colours, spacing, radii,
              and shadows. Instead of hard-coding a specific blue colour everywhere, Studytrix uses a token
              called <code className="rounded bg-muted/60 px-1 py-0.5 text-xs">--primary</code>. When the
              theme changes, only the token's value changes and every component updates automatically.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Light and Dark Mode</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Studytrix ships with a light and dark theme that follows your system preference by default.
              The theme switcher in Settings always lets you override this manually. Both themes are
              carefully calibrated so text remains readable and interactive elements stay visible
              against their backgrounds.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">How Tokens Are Organised</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tokens are grouped into semantic categories:
            </p>
            <ul className="mt-3 space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li className="list-disc">
                <strong>Foreground / Background</strong> — Base text and surface colours.
              </li>
              <li className="list-disc">
                <strong>Card / Muted</strong> — Elevated surfaces (cards, panels) and subdued backgrounds.
              </li>
              <li className="list-disc">
                <strong>Border</strong> — Separator lines and interactive element outlines.
              </li>
              <li className="list-disc">
                <strong>Primary / Accent</strong> — Brand colours used for buttons, links, and focus states.
              </li>
              <li className="list-disc">
                <strong>Destructive</strong> — Red-toned values used for delete actions and error states.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Consistency Across Components</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Every component in Studytrix — buttons, cards, dialogs, the Command Center, the file manager,
              settings panels — references the same token set. This means if you change your theme,
              everything updates at once. There are no "forgotten" components that still show an old colour.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Animations follow the same principle. Motion tokens define easing curves and durations, so
              transitions feel consistent whether you're opening a dropdown or navigating between pages.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Accessibility</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Both themes maintain a minimum contrast ratio of 4.5:1 for body text and 3:1 for large text,
              meeting WCAG 2.1 AA requirements. Interactive elements have visible focus rings, and
              colour is never the sole indicator of state — icons and text labels provide redundant cues.
            </p>
          </section>

          <aside className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 text-sm text-foreground">
            <p>
              Switch between themes in <strong>Settings → Appearance</strong>. Your preference is
              saved locally and applied instantly.
            </p>
          </aside>
        </section>

        <nav className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-3 py-3 text-sm">
          <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
            ← All articles
          </Link>
          <Link href="/blog" className="font-medium text-primary transition-colors hover:text-primary/80">
            All articles →
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
