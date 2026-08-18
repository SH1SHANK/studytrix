import { getDatabase, destroyDatabase } from "@/db/database";

describe("RxDB Database Initialization", () => {
  afterEach(async () => {
    await destroyDatabase();
  });

  it("should initialize database with all 6 collections using memory storage in tests", async () => {
    const db = await getDatabase(true);

    expect(db).toBeDefined();
    expect(db.collections.workspaces).toBeDefined();
    expect(db.collections.tags).toBeDefined();
    expect(db.collections.tag_assignments).toBeDefined();
    expect(db.collections.settings).toBeDefined();
    expect(db.collections.drive_sources).toBeDefined();
    expect(db.collections.drive_files).toBeDefined();
  });

  it("should maintain a singleton instance across calls", async () => {
    const db1 = await getDatabase(true);
    const db2 = await getDatabase(true);

    expect(db1).toBe(db2);
  });
});
