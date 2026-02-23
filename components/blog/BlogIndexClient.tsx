"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { BlogArticleSummary } from "@/features/blog/blog.catalog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BlogIndexClientProps = {
  articles: BlogArticleSummary[];
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function BlogIndexClient({ articles }: BlogIndexClientProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!needle) {
      return articles;
    }

    return articles.filter((article) => {
      const title = normalize(article.title);
      const tags = article.tags.map(normalize).join(" ");
      return title.includes(needle) || tags.includes(needle);
    });
  }, [articles, query]);

  return (
    <section className="mt-4">
      <div className="rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Studytrix Blog
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Updates, features, and learning resources
        </p>

        <div className="mt-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or tag..."
            className="h-10 rounded-lg px-3 text-sm"
            aria-label="Search blog articles"
          />
        </div>
      </div>

      <motion.div
        layout
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <AnimatePresence>
          {filtered.map((article, index) => (
            <motion.article
              key={article.slug}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
            >
              <Card className="h-full rounded-2xl border-border/80 bg-card/90 shadow-sm transition-colors hover:border-primary/35">
                <CardContent className="flex h-full flex-col px-4 py-4">
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{article.date}{article.readingTime ? ` · ${article.readingTime}` : ""}</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {article.tags.map((tag) => (
                        <Badge key={`${article.slug}-${tag}`} variant="outline" className="border-border/70 bg-muted/40 text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <h2 className="text-sm font-semibold leading-snug text-foreground sm:text-base">
                    {article.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {article.excerpt}
                  </p>

                  <div className="mt-auto pt-4">
                    <Link
                      href={article.href}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80 sm:text-sm"
                    >
                      Read →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border/80 px-4 py-6 text-center text-sm text-muted-foreground">
          No articles match your search.
        </div>
      ) : null}
    </section>
  );
}
