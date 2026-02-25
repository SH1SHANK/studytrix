import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { LegalDocument } from "@/features/legal/legal.documents";

type LegalDocumentViewProps = {
  document: LegalDocument;
};

export function LegalDocumentView({ document }: LegalDocumentViewProps) {
  return (
    <article className="px-4 py-5 sm:px-5">
      <header className="rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="border-border/70 bg-muted/40">
            v{document.version}
          </Badge>
          <span>Effective: {document.effectiveDate}</span>
          <span aria-hidden="true">·</span>
          <span>Updated: {document.lastUpdated}</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {document.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {document.description}
        </p>
      </header>

      <section className="mt-4 space-y-4 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
        {document.sections.map((section) => (
          <section key={`${document.slug}-${section.heading}`}>
            <h2 className="text-base font-semibold text-foreground">{section.heading}</h2>
            <div className="mt-2 space-y-2">
              {section.paragraphs.map((paragraph) => (
                <p
                  key={`${section.heading}-${paragraph.slice(0, 30)}`}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-xl border border-border/70 bg-muted/35 p-3">
          <p className="text-sm text-foreground/90">
            Legal contact:{" "}
            <a
              href={`mailto:${document.contactEmail}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {document.contactEmail}
            </a>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Governing law and jurisdiction: {document.jurisdiction}
          </p>
        </section>
      </section>

      <nav className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-3 py-3 text-sm">
        <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
          ← Back to app
        </Link>
        <Link href="/documentation" className="font-medium text-primary transition-colors hover:text-primary/80">
          Documentation →
        </Link>
      </nav>
    </article>
  );
}
