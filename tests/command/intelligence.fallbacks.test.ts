import {
  shouldMergeSemanticResults,
  shouldRunSemanticQuery,
} from "@/features/intelligence/intelligence.fallbacks";

describe("intelligence.fallbacks", () => {
  it("does not run semantic query when smart search is disabled", () => {
    expect(
      shouldRunSemanticQuery({
        enabled: false,
        runtimeStatus: "ready",
        query: "operating systems",
      }),
    ).toBe(false);
  });

  it("does not merge semantic results while runtime is loading", () => {
    expect(
      shouldMergeSemanticResults({
        enabled: true,
        runtimeStatus: "loading",
        query: "osi layer",
        semanticHitCount: 5,
      }),
    ).toBe(false);
  });

  it("merges semantic results only when query is non-empty and hits are present", () => {
    expect(
      shouldMergeSemanticResults({
        enabled: true,
        runtimeStatus: "ready",
        query: "computer networks",
        semanticHitCount: 2,
      }),
    ).toBe(true);

    expect(
      shouldMergeSemanticResults({
        enabled: true,
        runtimeStatus: "ready",
        query: "",
        semanticHitCount: 2,
      }),
    ).toBe(false);
  });
});
