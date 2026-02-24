import {
  SUMMARIZE_MAX_INPUT_CHARS,
  buildExtractiveSummary,
  sanitizeSummarizeText,
} from "@/features/intelligence/summarize.shared";

describe("summarize.shared", () => {
  it("sanitizes control characters and truncates input", () => {
    const raw = `alpha\u0000 beta ${"x".repeat(SUMMARIZE_MAX_INPUT_CHARS + 200)}`;
    const result = sanitizeSummarizeText(raw, 128);
    expect(result.includes("\u0000")).toBe(false);
    expect(result.length).toBe(128);
  });

  it("builds structured fallback summary sections", () => {
    const text = `
Thermodynamics explains heat and energy transfer in systems.
The first law states that energy is conserved.
Entropy measures the direction of spontaneous processes.
Carnot efficiency gives the maximum possible thermal efficiency.
Definition: Enthalpy is a state function.
Definition: Isothermal process occurs at constant temperature.
`;

    const summary = buildExtractiveSummary(text);
    expect(summary).toContain("Overview:");
    expect(summary).toContain("Key concepts:");
    expect(summary).toContain("Important terms:");
    expect(summary.toLowerCase()).toContain("enthalpy");
  });
});
