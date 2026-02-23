import { mergeSemanticKeywordResults } from "@/features/intelligence/intelligence.merge";

describe("intelligence.merge", () => {
  it("blends keyword and semantic score using semantic weight", () => {
    const merged = mergeSemanticKeywordResults({
      items: [
        {
          item: { id: "a", title: "Alpha" },
          keywordScore: 180,
          semanticScore: 0.1,
          dedupeKey: "id:a",
        },
        {
          item: { id: "b", title: "Beta" },
          keywordScore: 40,
          semanticScore: 0.95,
          dedupeKey: "id:b",
        },
      ],
      semanticWeightPercent: 60,
      limit: 5,
      sortTieBreaker: (left, right) => left.id.localeCompare(right.id),
    });

    expect(merged).toHaveLength(2);
    expect(merged[0].item.id).toBe("b");
    expect(merged[0].finalScore).toBeGreaterThan(merged[1].finalScore);
  });

  it("deduplicates by dedupe key and keeps the best scored candidate", () => {
    const merged = mergeSemanticKeywordResults({
      items: [
        {
          item: { id: "x", title: "X 1" },
          keywordScore: 10,
          semanticScore: 0.3,
          dedupeKey: "entity:42",
        },
        {
          item: { id: "y", title: "X 2" },
          keywordScore: 20,
          semanticScore: 0.9,
          dedupeKey: "entity:42",
        },
      ],
      semanticWeightPercent: 60,
      limit: 10,
    });

    expect(merged).toHaveLength(1);
    expect(merged[0].item.id).toBe("y");
  });
});
