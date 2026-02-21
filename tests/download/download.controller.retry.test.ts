import { jest } from "@jest/globals";

import { DownloadRequestError } from "@/features/download/download.resilience";

jest.mock("@/features/offline/offline.db", () => ({
  getAllFiles: jest.fn(async () => []),
  getFile: jest.fn(async () => null),
  setMetadata: jest.fn(async () => undefined),
}));

jest.mock("@/features/offline/offline.flags", () => ({
  isOfflineV3Enabled: jest.fn(() => false),
}));

jest.mock("@/features/offline/offline.integrity", () => ({
  generateChecksum: jest.fn(async () => "checksum"),
}));

jest.mock("@/features/offline/offline.index.store", () => ({
  markOfflineAvailability: jest.fn(),
}));

jest.mock("@/features/settings/settings.store", () => ({
  useSettingsStore: {
    getState: () => ({
      values: {
        storage_limit_mb: 500,
      },
    }),
  },
}));

jest.mock("@/features/storage/storage.service", () => ({
  storeOfflineFileVerified: jest.fn(async () => undefined),
}));

jest.mock("@/features/file/file-metadata.client", () => ({
  getFileMetadataWithCache: jest.fn(async () => ({ metadata: null })),
  writeDownloadMeta: jest.fn(async () => undefined),
}));

jest.mock("@/features/download/download.events", () => ({
  emit: jest.fn(),
}));

jest.mock("@/features/download/download.store", () => {
  const useDownloadStore = Object.assign(jest.fn(), {
    getState: () => ({ tasks: {} }),
    subscribe: () => () => undefined,
  });
  return { useDownloadStore };
});

import {
  DOWNLOAD_MAX_RETRY_ATTEMPTS,
  shouldRetryDownloadAttempt,
} from "@/features/download/download.controller";

describe("download.controller retry policy", () => {
  it("retries transient errors before final attempt", () => {
    const error = new DownloadRequestError("upstream unavailable", {
      status: 503,
      remoteErrorCode: "UPSTREAM_UNAVAILABLE",
    });

    expect(shouldRetryDownloadAttempt(error, 0)).toBe(true);
    expect(shouldRetryDownloadAttempt(error, DOWNLOAD_MAX_RETRY_ATTEMPTS - 1)).toBe(false);
  });

  it("does not retry hard failures", () => {
    const error = new DownloadRequestError("file not found", {
      status: 404,
      remoteErrorCode: "FILE_NOT_FOUND",
    });

    expect(shouldRetryDownloadAttempt(error, 0)).toBe(false);
  });

  it("respects custom max attempts", () => {
    const error = new Error("Failed to fetch");
    expect(shouldRetryDownloadAttempt(error, 0, 1)).toBe(false);
    expect(shouldRetryDownloadAttempt(error, 0, 2)).toBe(true);
  });
});
