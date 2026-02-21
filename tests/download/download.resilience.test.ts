import { jest } from "@jest/globals";

import {
  DownloadRequestError,
  classifyDownloadErrorCode,
  computeRetryDelayMs,
  isTransientDownloadError,
  isTransientStatusCode,
  waitForRetryDelay,
} from "@/features/download/download.resilience";

describe("download.resilience", () => {
  it("classifies transient status codes", () => {
    expect(isTransientStatusCode(500)).toBe(true);
    expect(isTransientStatusCode(429)).toBe(true);
    expect(isTransientStatusCode(404)).toBe(false);
    expect(isTransientStatusCode(undefined)).toBe(false);
  });

  it("detects transient errors from request status and messages", () => {
    expect(
      isTransientDownloadError(new DownloadRequestError("upstream", { status: 503 })),
    ).toBe(true);
    expect(
      isTransientDownloadError(new DownloadRequestError("missing", { status: 404 })),
    ).toBe(false);
    expect(isTransientDownloadError(new Error("Failed to fetch"))).toBe(true);
  });

  it("classifies normalized error codes", () => {
    expect(
      classifyDownloadErrorCode(
        new DownloadRequestError("rate", { status: 429, remoteErrorCode: "RATE_LIMITED" }),
      ),
    ).toBe("RATE_LIMITED");
    expect(
      classifyDownloadErrorCode(
        new DownloadRequestError("missing", { status: 404, remoteErrorCode: "FILE_NOT_FOUND" }),
      ),
    ).toBe("NOT_FOUND");
    expect(classifyDownloadErrorCode(new Error("Offline storage limit reached"))).toBe("QUOTA");
    expect(classifyDownloadErrorCode(new Error("You are offline."))).toBe("OFFLINE");
  });

  it("computes bounded retry delay", () => {
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);
    expect(computeRetryDelayMs(1, { baseMs: 200, capMs: 2000, jitterRatio: 0.2 })).toBe(200);
    expect(computeRetryDelayMs(2, { baseMs: 200, capMs: 2000, jitterRatio: 0.2 })).toBe(400);
    expect(computeRetryDelayMs(20, { baseMs: 200, capMs: 900, jitterRatio: 0.2 })).toBe(900);
    randomSpy.mockRestore();
  });

  it("rejects delayed wait when aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(waitForRetryDelay(50, controller.signal)).rejects.toThrow("Aborted");
  });
});
