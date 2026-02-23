import {
  INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID,
} from "@/features/intelligence/intelligence.constants";
import {
  isCleanupOutputTooShort,
  resolveCleanupModelId,
} from "@/features/intelligence/intelligence.cleanup.utils";

describe("intelligence.cleanup.client", () => {
  it("resolves unknown cleanup model ids to default", () => {
    expect(resolveCleanupModelId("Xenova/does-not-exist")).toBe(
      INTELLIGENCE_CLEANUP_DEFAULT_MODEL_ID,
    );
  });

  it("flags over-aggressive cleanup output as too short", () => {
    const source = "This is a long OCR paragraph with details and line items for revision.";
    expect(isCleanupOutputTooShort(source, "short summary")).toBe(true);
    expect(isCleanupOutputTooShort(source, source)).toBe(false);
  });
});
