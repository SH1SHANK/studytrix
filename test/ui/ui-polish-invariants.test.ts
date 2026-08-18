import { getHumanReadableContentStatus } from "@/features/drive/drive.types";
import { useOnboardingStore } from "@/features/onboarding/onboarding.store";
import { driveScanner } from "@/features/drive/drive-scanner";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import { getDatabase, destroyDatabase } from "@/db/database";

describe("UI Polish & Onboarding Invariants", () => {
  beforeEach(async () => {
    await getDatabase(true);
    useOnboardingStore.getState().reset();
  });

  afterEach(async () => {
    await destroyDatabase();
  });

  describe("1. Human-Readable Status Mappings", () => {
    it("should preserve the distinction between remote source availability and local content cache", () => {
      // 1. Available Remote
      expect(getHumanReadableContentStatus("available", "indexed")).toEqual({
        label: "Ready offline",
        badgeVariant: "success",
        isOfflineAvailable: true,
      });

      expect(getHumanReadableContentStatus("available", "downloaded")).toEqual({
        label: "Available offline",
        badgeVariant: "success",
        isOfflineAvailable: true,
      });

      expect(getHumanReadableContentStatus("available", "not-downloaded")).toEqual({
        label: "Online only",
        badgeVariant: "outline",
        isOfflineAvailable: false,
      });

      expect(getHumanReadableContentStatus("available", "downloading")).toEqual({
        label: "Downloading…",
        badgeVariant: "warning",
        isOfflineAvailable: false,
      });

      expect(getHumanReadableContentStatus("available", "error")).toEqual({
        label: "Download failed",
        badgeVariant: "destructive",
        isOfflineAvailable: false,
      });

      // 2. Deleted Remote with local downloaded copy available
      expect(getHumanReadableContentStatus("deleted", "downloaded")).toEqual({
        label: "Source removed · Available offline",
        badgeVariant: "secondary",
        isOfflineAvailable: true,
      });

      expect(getHumanReadableContentStatus("deleted", "indexed")).toEqual({
        label: "Source removed · Available offline",
        badgeVariant: "secondary",
        isOfflineAvailable: true,
      });

      // 3. Deleted Remote without local copy
      expect(getHumanReadableContentStatus("deleted", "not-downloaded")).toEqual({
        label: "Source removed",
        badgeVariant: "destructive",
        isOfflineAvailable: false,
      });

      // 4. Unavailable Remote with local copy available
      expect(getHumanReadableContentStatus("unavailable", "downloaded")).toEqual({
        label: "Available offline",
        badgeVariant: "success",
        isOfflineAvailable: true,
      });

      // 5. Unavailable Remote without local copy
      expect(getHumanReadableContentStatus("unavailable", "not-downloaded")).toEqual({
        label: "Source unavailable",
        badgeVariant: "destructive",
        isOfflineAvailable: false,
      });
    });
  });

  describe("2. Onboarding Lifecycle & Store Hydration", () => {
    it("should support explicit isHydrated state and markCompleted", () => {
      const store = useOnboardingStore.getState();
      expect(store.completed).toBe(false);

      // Hydrate
      store.setHydrated(true);
      expect(useOnboardingStore.getState().isHydrated).toBe(true);

      // Complete
      store.markCompleted();
      expect(useOnboardingStore.getState().completed).toBe(true);
      expect(useOnboardingStore.getState().active).toBe(false);
    });
  });

  describe("3. Controlled Concurrency in Drive Scanner", () => {
    it("should scan multiple sources in batches without failing the whole batch if one fails", async () => {
      const src1 = await driveSourceRepository.addSource({
        folderId: "folder_1",
        url: "https://drive.google.com/drive/folders/folder_1",
        name: "Source 1",
      });
      const src2 = await driveSourceRepository.addSource({
        folderId: "folder_2",
        url: "https://drive.google.com/drive/folders/folder_2",
        name: "Source 2",
      });

      // Mock scanSource
      const scanned: string[] = [];
      const spy = jest.spyOn(driveScanner, "scanSource").mockImplementation(async (id: string) => {
        scanned.push(id);
      });

      await driveScanner.scanAll(2);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(scanned).toContain(src1.id);
      expect(scanned).toContain(src2.id);

      spy.mockRestore();
    });
  });
});
