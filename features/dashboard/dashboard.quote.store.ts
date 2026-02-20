"use client";

import { create } from "zustand";

const CACHE_KEY = "dashboard_quote_of_day";

const FALLBACK_QUOTE = "The only way to do great work is to love what you do.";
const FALLBACK_AUTHOR = "Steve Jobs";

interface CachedQuote {
  quote: string;
  author: string;
  cachedAt: string; // ISO timestamp
}

interface QuoteState {
  quote: string | null;
  author: string | null;
  isLoading: boolean;
  error: string | null;
  fetchQuote: () => Promise<void>;
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadCachedQuote(): CachedQuote | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("quote" in parsed) ||
      !("author" in parsed) ||
      !("cachedAt" in parsed)
    ) {
      return null;
    }

    const entry = parsed as CachedQuote;
    if (
      typeof entry.quote !== "string" ||
      typeof entry.author !== "string" ||
      typeof entry.cachedAt !== "string"
    ) {
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

function saveCachedQuote(quote: string, author: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const entry: CachedQuote = {
      quote,
      author,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage failures (private mode, quota etc.)
  }
}

export const useQuoteStore = create<QuoteState>((set, get) => ({
  quote: null,
  author: null,
  isLoading: true,
  error: null,

  fetchQuote: async () => {
    // Don't re-fetch if we already have data loaded this session
    if (get().quote !== null && !get().isLoading) {
      return;
    }

    // 1. Check localStorage cache
    const cached = loadCachedQuote();
    if (cached) {
      const cachedDate = cached.cachedAt.slice(0, 10); // YYYY-MM-DD
      const today = getTodayDateString();

      if (cachedDate === today) {
        set({
          quote: cached.quote,
          author: cached.author,
          isLoading: false,
          error: null,
        });
        return;
      }
    }

    // 2. Fetch from API route
    set({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/quote");

      if (!response.ok) {
        throw new Error(`Quote API responded with ${response.status}`);
      }

      const data = (await response.json()) as {
        quote?: string;
        author?: string;
      };

      const quote = data.quote ?? FALLBACK_QUOTE;
      const author = data.author ?? FALLBACK_AUTHOR;

      saveCachedQuote(quote, author);

      set({ quote, author, isLoading: false, error: null });
    } catch (err) {
      // Use cached quote if available (even if from a previous day),
      // otherwise use hardcoded fallback
      const staleQuote = cached?.quote ?? FALLBACK_QUOTE;
      const staleAuthor = cached?.author ?? FALLBACK_AUTHOR;

      set({
        quote: staleQuote,
        author: staleAuthor,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch quote",
      });
    }
  },
}));
