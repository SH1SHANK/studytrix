import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { getBlogArticleBySlug } from "@/features/blog/blog.catalog";

interface BlogPlaceholderPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPlaceholderPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);

  if (!article) {
    return {
      title: "Blog",
    };
  }

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: article.href,
    },
  };
}

export default async function BlogPlaceholderPage({ params }: BlogPlaceholderPageProps) {
  const { slug } = await params;
  const article = getBlogArticleBySlug(slug);

  if (
    !article
    || slug === "how-semantic-search-works"
    || slug === "copy-contents-pipeline"
    || slug === "command-center"
    || slug === "cleanup-engine"
    || slug === "offline-v3"
    || slug === "organise-files"
    || slug === "theme-system"
  ) {
    notFound();
  }

  return (
    <AppShell headerTitle="Blog" hideHeaderFilters={true}>
      <article className="px-4 py-5 sm:px-5">
        <header className="rounded-2xl border border-border/80 bg-card/85 p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{article.date}</span>
            <span aria-hidden="true">·</span>
            {article.tags.map((tag) => (
              <Badge key={`${article.slug}-${tag}`} variant="outline" className="border-border/70 bg-muted/40">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {article.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{article.excerpt}</p>
        </header>

        <section className="mt-4 rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Full article content for this post is being prepared. Check back soon for the complete write-up.
          </p>
        </section>

        <nav className="mt-4 flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-3 py-3 text-sm">
          <Link href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
            ← All articles
          </Link>
          <Link href="/" className="font-medium text-primary transition-colors hover:text-primary/80">
            Back to app →
          </Link>
        </nav>
      </article>
    </AppShell>
  );
}
