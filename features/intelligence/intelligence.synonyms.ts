/**
 * Static synonym expansion map for semantic query enrichment.
 *
 * **Format:** Each key is a canonical term (lowercase). Its value is an array
 * of alternative phrasings, abbreviations, or related terms that should be
 * appended to the original query when the key appears in the user's input.
 *
 * **Domains currently covered:**
 *  - Academic document types (notes, assignments, syllabi)
 *  - Exam / assessment terminology (exam, test, midsem, endsem)
 *  - Laboratory / practical work (lab, practical, record)
 *
 * **Maintenance:**
 *  - Keep keys in lowercase — matching is done against `query.toLowerCase()`.
 *  - Values should be short phrases or single words; avoid duplicating keys.
 *  - Add new entries for any domain-specific abbreviations that users commonly
 *    search for but the embedding model may not associate (e.g. "PYQ" → "previous year question").
 */
const SYNONYM_MAP: Record<string, string[]> = {
  notes: ["lecture notes", "class notes", "handwritten notes"],
  assignment: ["homework", "hw", "practice"],
  syllabus: ["course outline", "curriculum"],
  exam: ["test", "assessment", "midsem", "endsem"],
  lab: ["practical", "record", "experiment"],
};

export function expandSemanticQuery(query: string): string {
  const normalized = query.trim();
  if (!normalized) {
    return "";
  }

  const lowercase = normalized.toLowerCase();
  const expansions = new Set<string>([normalized]);

  for (const [key, values] of Object.entries(SYNONYM_MAP)) {
    if (!lowercase.includes(key)) {
      continue;
    }

    for (const value of values) {
      expansions.add(value);
    }
  }

  return Array.from(expansions).join(" ");
}
