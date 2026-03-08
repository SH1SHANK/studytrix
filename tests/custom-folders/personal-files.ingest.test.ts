import { jest } from "@jest/globals";

import {
  PERSONAL_ROOT_FOLDER_ID,
  LEGACY_UNSORTED_CAPTURES_ID,
} from "@/features/custom-folders/personal-root.constants";
import { savePersonalFileLocal } from "@/features/custom-folders/personal-files.ingest";

const putFileMock = jest.fn<any>(async () => undefined);
const enqueuePendingCaptureMock = jest.fn<any>(async () => undefined);
const upsertRecordMock = jest.fn<any>(() => undefined);
const indexIncrementalFilesMock = jest.fn<any>(async () => undefined);

let foldersState: any[] = [];
const personalFilesState = {
  records: [] as any[],
  upsertRecord: (record: any) => upsertRecordMock(record),
};

jest.mock("@/features/offline/offline.db", () => ({
  putFile: (...args: any[]) => putFileMock(...args),
}));

jest.mock("@/features/custom-folders/capture.queue", () => ({
  enqueuePendingCapture: (...args: any[]) => enqueuePendingCaptureMock(...args),
}));

jest.mock("@/features/custom-folders/custom-folders.store", () => ({
  useCustomFoldersStore: {
    getState: () => ({
      folders: foldersState,
    }),
  },
}));

jest.mock("@/features/custom-folders/personal-files.store", () => ({
  usePersonalFilesStore: {
    getState: () => personalFilesState,
  },
}));

jest.mock("@/features/intelligence/intelligence.store", () => ({
  useIntelligenceStore: {
    getState: () => ({
      indexIncrementalFiles: (...args: any[]) => indexIncrementalFilesMock(...args),
    }),
  },
}));

describe("personal-files.ingest root handling", () => {
  beforeEach(() => {
    foldersState = [];
    putFileMock.mockClear();
    enqueuePendingCaptureMock.mockClear();
    upsertRecordMock.mockClear();
    indexIncrementalFilesMock.mockClear();
  });

  it("normalizes empty folder id to personal root and skips sync queue", async () => {
    await savePersonalFileLocal({
      folderId: "",
      fileName: "Root Capture.md",
      mimeType: "text/markdown",
      blob: new Blob(["hello"], { type: "text/markdown" }),
      source: "capture",
    });

    const savedRecord = upsertRecordMock.mock.calls[0][0];
    expect(savedRecord.folderId).toBe(PERSONAL_ROOT_FOLDER_ID);
    expect(savedRecord.fullPath).toBe("Personal Repository > Root Capture.md");
    expect(enqueuePendingCaptureMock).not.toHaveBeenCalled();

    const indexedFile = indexIncrementalFilesMock.mock.calls[0][0][0];
    expect(indexedFile.customFolderId).toBe(PERSONAL_ROOT_FOLDER_ID);
    expect(indexedFile.ancestorIds).toEqual([]);
  });

  it("normalizes legacy unsorted captures id to personal root", async () => {
    await savePersonalFileLocal({
      folderId: LEGACY_UNSORTED_CAPTURES_ID,
      fileName: "Legacy Capture.jpg",
      mimeType: "image/jpeg",
      blob: new Blob(["x"], { type: "image/jpeg" }),
      source: "capture",
    });

    const savedRecord = upsertRecordMock.mock.calls[0][0];
    expect(savedRecord.folderId).toBe(PERSONAL_ROOT_FOLDER_ID);
    expect(enqueuePendingCaptureMock).not.toHaveBeenCalled();
  });

  it("queues sync when capture targets a drive-backed folder", async () => {
    foldersState = [
      {
        id: "drive-folder-1",
        label: "Drive Folder",
        sourceKind: "drive",
      },
    ];

    await savePersonalFileLocal({
      folderId: "drive-folder-1",
      fileName: "Lecture.pdf",
      mimeType: "application/pdf",
      blob: new Blob(["pdf"], { type: "application/pdf" }),
      source: "capture",
    });

    expect(enqueuePendingCaptureMock).toHaveBeenCalledTimes(1);
    expect(enqueuePendingCaptureMock.mock.calls[0][0].folderId).toBe("drive-folder-1");

    const indexedFile = indexIncrementalFilesMock.mock.calls[0][0][0];
    expect(indexedFile.customFolderId).toBe("drive-folder-1");
  });
});
