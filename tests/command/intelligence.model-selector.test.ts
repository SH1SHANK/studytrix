import {
  isLowEndDevice,
  normalizeModelCatalog,
  resolveAutoModelId,
} from "@/features/intelligence/intelligence.model-selector";

describe("intelligence.model-selector", () => {
  const catalog = normalizeModelCatalog({
    version: "1",
    models: [
      {
        id: "Xenova/all-MiniLM-L6-v2",
        label: "MiniLM",
        sizeMb: 23,
        embeddingDim: 384,
        tier: "small",
        recommendedFor: "low_end",
        status: "active",
      },
      {
        id: "Xenova/bge-small-en-v1.5",
        label: "BGE",
        sizeMb: 34,
        embeddingDim: 384,
        tier: "balanced",
        recommendedFor: "balanced",
        status: "active",
      },
    ],
    defaults: {
      autoLowEnd: "Xenova/all-MiniLM-L6-v2",
      autoBalanced: "Xenova/bge-small-en-v1.5",
    },
  });

  it("detects low-end device profile", () => {
    expect(
      isLowEndDevice({
        saveData: true,
        effectiveType: "4g",
        deviceMemory: 8,
        hardwareConcurrency: 8,
      }),
    ).toBe(true);

    expect(
      isLowEndDevice({
        saveData: false,
        effectiveType: "4g",
        deviceMemory: 8,
        hardwareConcurrency: 8,
      }),
    ).toBe(false);
  });

  it("resolves default model by device class", () => {
    expect(catalog).not.toBeNull();

    const lowEnd = resolveAutoModelId(catalog!, {
      saveData: false,
      effectiveType: "2g",
      deviceMemory: 2,
      hardwareConcurrency: 4,
    });
    const balanced = resolveAutoModelId(catalog!, {
      saveData: false,
      effectiveType: "4g",
      deviceMemory: 8,
      hardwareConcurrency: 8,
    });

    expect(lowEnd).toBe("Xenova/all-MiniLM-L6-v2");
    expect(balanced).toBe("Xenova/bge-small-en-v1.5");
  });
});
