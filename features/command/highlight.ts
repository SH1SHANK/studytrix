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

export function highlightText(text: string, query: string): HighlightSegment[] {
  if (!query.trim()) {
    return [{ text, matched: false }];
  }

  const terms = query.trim().toLowerCase().split(/\s+/);
  const lower = text.toLowerCase();
  const mask = new Uint8Array(text.length); // 0 = unmatched, 1 = matched

  for (const term of terms) {
    if (term.length === 0) continue;

    let start = 0;
    while (start <= lower.length - term.length) {
      const idx = lower.indexOf(term, start);
      if (idx === -1) break;

      for (let i = idx; i < idx + term.length; i++) {
        mask[i] = 1;
      }

      start = idx + 1;
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
