import { NextResponse } from "next/server";

const FALLBACK_QUOTE = {
  quote: "The only way to do great work is to love what you do.",
  author: "Steve Jobs",
};

export async function GET() {
  return NextResponse.json(FALLBACK_QUOTE);
}
