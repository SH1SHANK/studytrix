export const SUMMARIZE_MIN_TEXT_LENGTH = 50;
export const SUMMARIZE_MAX_INPUT_CHARS = 16000;
const MAX_OVERVIEW_SENTENCES = 5;
const MAX_KEY_CONCEPTS = 8;

const STOP_WORDS = new Set<string>([
  "about", "after", "again", "against", "also", "among", "and", "are", "because", "been",
  "before", "between", "both", "but", "can", "could", "did", "does", "each", "from", "have",
  "into", "its", "more", "most", "must", "over", "such", "than", "that", "their", "them",
  "then", "there", "these", "they", "this", "those", "through", "under", "using", "very",
  "what", "when", "where", "which", "while", "with", "would", "your", "you",
]);

function stripControlChars(value: string): string {
  return value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
}

export function sanitizeSummarizeText(
  value: string,
  maxChars = SUMMARIZE_MAX_INPUT_CHARS,
): string {
  return stripControlChars(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function splitSentences(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
      const segments = Array.from(segmenter.segment(normalized))
        .map((segment) => segment.segment.trim())
        .filter((segment) => segment.length > 0);

      if (segments.length > 0) {
        return segments;
      }
    } catch {
      // Fall through to regex segmentation.
    }
  }

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function topKeywords(text: string, limit = MAX_KEY_CONCEPTS): string[] {
  const counts = new Map<string, number>();
  const tokens = text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [];

  for (const token of tokens) {
    if (STOP_WORDS.has(token)) {
      continue;
    }

    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function pickOverviewSentences(text: string): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return [];
  }

  const keywords = topKeywords(text, MAX_KEY_CONCEPTS * 2);
  const keywordWeight = new Map<string, number>();
  for (const [index, keyword] of keywords.entries()) {
    keywordWeight.set(keyword, keywords.length - index);
  }

  const scored = sentences.map((sentence, index) => {
    const tokens = sentence.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? [];
    const keywordScore = tokens.reduce((accumulator, token) => {
      return accumulator + (keywordWeight.get(token) ?? 0);
    }, 0);
    const lengthBoost = Math.min(12, Math.floor(sentence.length / 18));
    const positionBoost = Math.max(0, 10 - index);
    const punctuationBoost = sentence.includes(":") ? 2 : 0;

    return {
      index,
      sentence,
      score: keywordScore + lengthBoost + positionBoost + punctuationBoost,
    };
  });

  return scored
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.min(MAX_OVERVIEW_SENTENCES, scored.length))
    .sort((left, right) => left.index - right.index)
    .map((item) => item.sentence);
}

function pickDefinitionLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.includes(":") && line.length >= 8 && line.length <= 160)
    .slice(0, 6);
}

function asBullets(values: string[], emptyFallback: string): string {
  if (values.length === 0) {
    return `- ${emptyFallback}`;
  }

  return values.map((value) => `- ${value}`).join("\n");
}

export function buildExtractiveSummary(text: string): string {
  const raw = stripControlChars(text).replace(/\r/g, "").slice(0, SUMMARIZE_MAX_INPUT_CHARS);
  const sanitized = sanitizeSummarizeText(raw);
  if (!sanitized) {
    return "Overview:\nNo extractable text was detected.\n\nKey concepts:\n- None\n\nImportant terms:\n- None";
  }

  const overviewSentences = pickOverviewSentences(sanitized);
  const concepts = topKeywords(sanitized, MAX_KEY_CONCEPTS);
  const definitions = pickDefinitionLines(raw);

  const overview = overviewSentences.length > 0
    ? overviewSentences.join(" ")
    : "This document contains study material with limited sentence structure.";

  return [
    `Overview:\n${overview}`,
    `Key concepts:\n${asBullets(concepts, "Main topic extracted from the provided text")}`,
    `Important terms:\n${asBullets(definitions, "No explicit term-definition pairs were detected in this excerpt.")}`,
  ].join("\n\n");
}
