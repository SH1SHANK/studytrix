import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { BlogIndexClient } from "@/components/blog/BlogIndexClient";
import { BLOG_ARTICLES } from "@/features/blog/blog.catalog";

export const metadata: Metadata = {
  title: "Blog",
  description: "Studytrix blog for product updates, features, and study workflow resources.",
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogPage() {
  return (
    <AppShell headerTitle="Blog" hideHeaderFilters={true}>
      <div className="px-4 py-5 sm:px-5">
        <BlogIndexClient articles={BLOG_ARTICLES} />
      </div>
    </AppShell>
  );
}
