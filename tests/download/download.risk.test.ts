import {
  DOWNLOAD_CONFIRM_THRESHOLD_BYTES,
  DOWNLOAD_WARN_THRESHOLD_BYTES,
  assessDownloadRisk,
  buildDownloadRiskConfirmDescription,
  buildDownloadRiskWarningMessage,
  summarizeRiskItems,
} from "@/features/download/download.risk";

describe("download.risk", () => {
  it("returns none tier when all files are below threshold", () => {
    const summary = assessDownloadRisk([
      { id: "a", name: "a.pdf", sizeBytes: 1024 },
      { id: "b", name: "b.pdf", sizeBytes: 20 * 1024 * 1024 },
    ]);

    expect(summary.tier).toBe("none");
    expect(summary.warnItems).toHaveLength(0);
    expect(summary.confirmItems).toHaveLength(0);
    expect(summary.unknownSizeCount).toBe(0);
  });

  it("returns warn tier for files >=25MB and unknown sizes", () => {
    const summary = assessDownloadRisk([
      { id: "a", name: "large-a.pdf", sizeBytes: DOWNLOAD_WARN_THRESHOLD_BYTES },
      { id: "b", name: "unknown.bin", sizeBytes: null },
    ]);

    expect(summary.tier).toBe("warn");
    expect(summary.warnItems).toHaveLength(1);
    expect(summary.confirmItems).toHaveLength(0);
    expect(summary.unknownSizeCount).toBe(1);

    const warning = buildDownloadRiskWarningMessage(summary);
    expect(warning).toContain("large file");
  });

  it("returns confirm tier for files >=100MB", () => {
    const summary = assessDownloadRisk([
      { id: "a", name: "huge-a.zip", sizeBytes: DOWNLOAD_CONFIRM_THRESHOLD_BYTES },
      { id: "b", name: "mid.bin", sizeBytes: 30 * 1024 * 1024 },
    ]);

    expect(summary.tier).toBe("confirm");
    expect(summary.confirmItems).toHaveLength(1);
    expect(summary.warnItems).toHaveLength(1);

    const description = buildDownloadRiskConfirmDescription(summary);
    expect(description).toContain("huge file");
    expect(description).toContain("huge-a.zip");
  });

  it("summarizes risk item names with limits", () => {
    const preview = summarizeRiskItems([
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "d", name: "D" },
    ], 2);

    expect(preview).toContain('"A"');
    expect(preview).toContain('"B"');
    expect(preview).toContain("and 2 more");
  });
});
