/**
 * Deterministic text‑highlight utility for the Command Palette.
 *
 * Algorithm:
 *  1. Build a boolean mask (length === text.length) initialised to `false`.
 *  2. For every search term, walk the lowercased source and mark matching
 *     character ranges as `true`.
 *  3. Walk the mask once to produce an array of contiguous segments, each
 *     annotated with `matched: true | false`.
 *
 * Guarantees:
 *  • O(n × t) where n = text length, t = number of query terms.
 *  • Original casing is preserved.
 *  • No regex, no innerHTML, no mutation.
 */

export interface HighlightSegment {
  text: string;
  matched: boolean;
}

function isAlphaNumeric(char: string | undefined): boolean {
  if (!char) {
    return false;
  }

  const code = char.charCodeAt(0);
  const isNumeric = code >= 48 && code <= 57;
  const isUpper = code >= 65 && code <= 90;
  const isLower = code >= 97 && code <= 122;
  return isNumeric || isUpper || isLower;
}

function markTerm(
  lower: string,
  term: string,
  mask: Uint8Array,
  wordBoundaryOnly: boolean,
): boolean {
  let found = false;
  let start = 0;

  while (start <= lower.length - term.length) {
    const idx = lower.indexOf(term, start);
    if (idx === -1) {
      break;
    }

    const prev = idx > 0 ? lower[idx - 1] : undefined;
    const isBoundary = !isAlphaNumeric(prev);
    if (!wordBoundaryOnly || isBoundary) {
      for (let i = idx; i < idx + term.length; i += 1) {
        mask[i] = 1;
      }
      found = true;
    }

    start = idx + 1;
  }

  return found;
}

export function highlightText(text: string, query: string): HighlightSegment[] {
  if (!query.trim()) {
    return [{ text, matched: false }];
  }

  const terms = Array.from(
    new Set(
      query
        .trim()
        .toLowerCase()
        .split(/[\s:._-]+/)
        .filter((term) => term.length > 0),
    ),
  ).sort((left, right) => right.length - left.length);
  const lower = text.toLowerCase();
  const mask = new Uint8Array(text.length); // 0 = unmatched, 1 = matched

  for (const term of terms) {
    if (!markTerm(lower, term, mask, true)) {
      markTerm(lower, term, mask, false);
    }
  }

  // Build segments by walking the mask
  const segments: HighlightSegment[] = [];
  let i = 0;

  while (i < text.length) {
    const currentState = mask[i] === 1;
    let j = i + 1;

    while (j < text.length && (mask[j] === 1) === currentState) {
      j++;
    }

    segments.push({ text: text.slice(i, j), matched: currentState });
    i = j;
  }

  return segments;
}
