export interface BlogArticleSummary {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  href: string;
  readingTime: string;
}

export const BLOG_ARTICLES: BlogArticleSummary[] = [
  {
    slug: "copy-contents-pipeline",
    title: "Introducing Copy Contents: Extract Text from Any File",
    date: "February 23, 2026",
    tags: ["Feature", "New"],
    excerpt: "The new Copy Contents action lets you extract full text from PDFs, Word docs, PowerPoint slides, and even scanned images — all on-device — and copy it to your clipboard in one tap.",
    href: "/blog/copy-contents-pipeline",
    readingTime: "5 min read",
  },
  {
    slug: "command-center",
    title: "The Command Center: Your Study Cockpit",
    date: "February 23, 2026",
    tags: ["Feature"],
    excerpt: "Studytrix's Command Center is more than a search bar. Learn how the unified command palette blends keyword and semantic search, quick actions, and file navigation into a single powerful interface.",
    href: "/blog/command-center",
    readingTime: "6 min read",
  },
  {
    slug: "how-semantic-search-works",
    title: "How Smart Search Works in Studytrix",
    date: "February 23, 2026",
    tags: ["Feature"],
    excerpt: "A plain-language walkthrough of semantic search and what happens on-device when you type a query.",
    href: "/blog/how-semantic-search-works",
    readingTime: "4 min read",
  },
  {
    slug: "cleanup-engine",
    title: "AI Cleanup Engine: Denoising OCR Text with T5",
    date: "February 22, 2026",
    tags: ["Feature", "AI"],
    excerpt: "Scanned documents often contain OCR artifacts — garbled characters, broken words, and missing spaces. The new Cleanup Engine uses a T5 language model running entirely on your device to fix them automatically.",
    href: "/blog/cleanup-engine",
    readingTime: "5 min read",
  },
  {
    slug: "offline-v3",
    title: "What's New in Offline Mode v3",
    date: "February 20, 2026",
    tags: ["Update"],
    excerpt: "Offline Mode v3 brings a complete overhaul of how Studytrix stores, syncs, and retrieves files when you're disconnected. Here's everything that changed.",
    href: "/blog/offline-v3",
    readingTime: "4 min read",
  },
  {
    slug: "organise-files",
    title: "5 Ways to Organise Your Study Files",
    date: "February 18, 2026",
    tags: ["Guide"],
    excerpt: "Small workflow tweaks that make your folders cleaner, easier to scan, and faster to search.",
    href: "/blog/organise-files",
    readingTime: "3 min read",
  },
  {
    slug: "theme-system",
    title: "Understanding the Theme System",
    date: "February 14, 2026",
    tags: ["Feature"],
    excerpt: "How Studytrix themes are structured and how visual tokens stay consistent across pages and dialogs.",
    href: "/blog/theme-system",
    readingTime: "3 min read",
  },
];

const BLOG_ARTICLE_MAP = new Map(BLOG_ARTICLES.map((article) => [article.slug, article]));

export function getBlogArticleBySlug(slug: string): BlogArticleSummary | null {
  return BLOG_ARTICLE_MAP.get(slug) ?? null;
}
