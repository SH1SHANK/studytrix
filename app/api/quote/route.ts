import { NextResponse } from "next/server";

const FALLBACK_QUOTE = {
  quote: "The only way to do great work is to love what you do.",
  author: "Steve Jobs",
};

export async function GET() {
  const apiKey = process.env.API_NINJAS_KEY;

  if (!apiKey) {
    return NextResponse.json(FALLBACK_QUOTE);
  }

  try {
    const response = await fetch("https://api.api-ninjas.com/v2/quoteoftheday", {
      headers: { "X-Api-Key": apiKey },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(FALLBACK_QUOTE);
    }

    const data = (await response.json()) as {
      quotes?: Array<{ quote?: string; author?: string }>;
    };

    const first = data.quotes?.[0];
    if (!first?.quote) {
      return NextResponse.json(FALLBACK_QUOTE);
    }

    return NextResponse.json({
      quote: first.quote,
      author: first.author ?? "Unknown",
    });
  } catch {
    return NextResponse.json(FALLBACK_QUOTE);
  }
}
