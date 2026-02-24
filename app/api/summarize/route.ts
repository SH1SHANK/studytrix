import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { enforceRateLimit } from "@/features/catalog/catalog.rateLimit";
import {
  SUMMARIZE_MAX_INPUT_CHARS,
  SUMMARIZE_MIN_TEXT_LENGTH,
  buildExtractiveSummary,
  sanitizeSummarizeText,
} from "@/features/intelligence/summarize.shared";

export const runtime = "nodejs";

const GEMINI_MODEL_CANDIDATES = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
] as const;
const MODEL_TIMEOUT_MS = 20_000;

function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "unknown";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function buildSummarizePrompt(text: string): string {
  return `You are summarizing academic study material for a student.
Produce a concise, high-signal summary of the following text.

Output format (strict):
Overview:
<3-5 clear sentences>

Key concepts:
- <bullet 1>
- <bullet 2>
- ...

Important terms:
- <term or definition when available>

If the text is noisy, infer the most relevant study points instead of copying verbatim.

Text:
${text}`;
}

async function summarizeWithGemini(apiKey: string, text: string): Promise<{
  summary: string;
  provider: string;
}> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildSummarizePrompt(text);
  let lastError: unknown = null;

  for (const modelName of GEMINI_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 900,
        },
      });

      const result = await withTimeout(model.generateContent(prompt), MODEL_TIMEOUT_MS);
      const summary = result.response.text().trim();
      if (summary.length > 0) {
        return {
          summary,
          provider: modelName,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to generate summary with available Gemini models");
}

export async function POST(req: Request): Promise<Response> {
  try {
    await enforceRateLimit(getRequestIp(req));
  } catch (error) {
    if (error instanceof Error && error.message === "Rate limit exceeded") {
      return Response.json({ error: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
    }
    // Fail open for summarize so missing/temporary rate-limit backends do not block users.
  }

  let payload: { text?: unknown };
  try {
    payload = await req.json() as { text?: unknown };
  } catch {
    return Response.json({ error: "INVALID_REQUEST_PAYLOAD" }, { status: 400 });
  }

  if (typeof payload.text !== "string") {
    return Response.json({ error: "INSUFFICIENT_TEXT_CONTENT" }, { status: 400 });
  }

  const truncatedText = sanitizeSummarizeText(payload.text, SUMMARIZE_MAX_INPUT_CHARS);
  if (truncatedText.length < SUMMARIZE_MIN_TEXT_LENGTH) {
    return Response.json({ error: "INSUFFICIENT_TEXT_CONTENT" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({
      summary: buildExtractiveSummary(truncatedText),
      source: "extractive-fallback",
      provider: "local",
    });
  }

  try {
    const result = await summarizeWithGemini(apiKey, truncatedText);
    return Response.json({
      summary: result.summary,
      source: "gemini",
      provider: result.provider,
    });
  } catch {
    return Response.json({
      summary: buildExtractiveSummary(truncatedText),
      source: "extractive-fallback",
      provider: "local",
    });
  }
}
