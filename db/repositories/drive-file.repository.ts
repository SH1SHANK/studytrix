import { map, Observable } from "rxjs";
import { getDatabase } from "../database";
import type { DriveFileDocType } from "../types";

export class DriveFileRepository {
  private lastRecordedOpens = new Map<string, number>();

  async getFilesForSource(sourceId: string): Promise<DriveFileDocType[]> {
    const db = await getDatabase();
    const docs = await db.drive_files
      .find({ selector: { sourceId } })
      .exec();
    return docs
      .map((d) => d.toJSON() as DriveFileDocType)
      .filter((f) => f.remoteStatus !== "deleted");
  }

  async getAllFilesForSource(sourceId: string): Promise<DriveFileDocType[]> {
    const db = await getDatabase();
    const docs = await db.drive_files
      .find({ selector: { sourceId } })
      .exec();
    return docs.map((d) => d.toJSON() as DriveFileDocType);
  }

  async getFile(sourceId: string, driveFileId: string): Promise<DriveFileDocType | null> {
    const db = await getDatabase();
    const id = `${sourceId}:${driveFileId}`;
    const doc = await db.drive_files.findOne(id).exec();
    return doc ? (doc.toJSON() as DriveFileDocType) : null;
  }

  async getFileById(id: string): Promise<DriveFileDocType | null> {
    const db = await getDatabase();
    const doc = await db.drive_files.findOne(id).exec();
    return doc ? (doc.toJSON() as DriveFileDocType) : null;
  }

  async bulkUpsert(files: Partial<DriveFileDocType>[]): Promise<void> {
    if (files.length === 0) return;
    const db = await getDatabase();
    const now = Date.now();
    const normalized: DriveFileDocType[] = files.map((f) => ({
      id: f.id || `${f.sourceId}:${f.driveFileId}`,
      sourceId: f.sourceId || "",
      driveFileId: f.driveFileId || "",
      parentFolderId: f.parentFolderId || "",
      workspaceId: f.workspaceId || "",
      localFolderId: f.localFolderId || "",
      name: f.name || "Untitled",
      mimeType: f.mimeType || "application/octet-stream",
      size: f.size ?? null,
      modifiedTime: f.modifiedTime ?? null,
      webViewUrl: f.webViewUrl ?? null,
      path: f.path || "",
      remoteStatus: f.remoteStatus || "available",
      contentStatus: f.contentStatus || "not-downloaded",
      errorMessage: f.errorMessage ?? null,
      indexedAt: f.indexedAt ?? null,
      downloadedAt: f.downloadedAt ?? null,
      lastOpenedAt: typeof f.lastOpenedAt === "number" ? f.lastOpenedAt : 0,
      createdAt: f.createdAt || now,
      updatedAt: f.updatedAt || now,
    }));
    await db.drive_files.bulkUpsert(normalized);
  }

  async updateFile(id: string, patch: Partial<DriveFileDocType>): Promise<DriveFileDocType | null> {
    const db = await getDatabase();
    const doc = await db.drive_files.findOne(id).exec();
    if (!doc) return null;

    const patched = await doc.incrementalPatch({
      ...patch,
      updatedAt: Date.now(),
    });

    return patched.toJSON() as DriveFileDocType;
  }

  async recordFileOpen(id: string): Promise<void> {
    const now = Date.now();
    const lastOpen = this.lastRecordedOpens.get(id);
    if (lastOpen && now - lastOpen < 3000) {
      return; // Skip rapid duplicate writes to avoid render storm
    }
    this.lastRecordedOpens.set(id, now);

    const db = await getDatabase();
    const doc = await db.drive_files.findOne(id).exec();
    if (!doc) return;

    await doc.incrementalPatch({
      lastOpenedAt: now,
      updatedAt: now,
    });
  }

  async getRecentFiles(limit = 12): Promise<DriveFileDocType[]> {
    const db = await getDatabase();
    const docs = await db.drive_files
      .find({
        selector: {
          lastOpenedAt: { $gt: 0 },
        },
        sort: [{ lastOpenedAt: "desc" }],
        limit,
      })
      .exec();
    return docs
      .map((d) => d.toJSON() as DriveFileDocType)
      .filter((f) => f.remoteStatus !== "deleted" && (f.lastOpenedAt || 0) > 0);
  }

  observeRecentFiles(limit = 12): Observable<DriveFileDocType[]> {
    return new Observable<DriveFileDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.drive_files
            .find({
              selector: {
                lastOpenedAt: { $gt: 0 },
              },
              sort: [{ lastOpenedAt: "desc" }],
              limit,
            })
            .$.pipe(
              map((docs) =>
                docs
                  .map((d) => d.toJSON() as DriveFileDocType)
                  .filter((f) => f.remoteStatus !== "deleted" && (f.lastOpenedAt || 0) > 0),
              ),
            );

          subscription = query$.subscribe({
            next: (data) => subscriber.next(data),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        })
        .catch((err) => subscriber.error(err));

      return () => {
        isSubscribed = false;
        subscription?.unsubscribe();
      };
    });
  }

  async getFilesInLocalFolder(workspaceId: string, localFolderId: string | null = null): Promise<DriveFileDocType[]> {
    const db = await getDatabase();
    const docs = await db.drive_files
      .find({
        selector: {
          workspaceId: workspaceId.trim(),
          localFolderId: localFolderId ? localFolderId.trim() : "",
        },
        sort: [{ name: "asc" }],
      })
      .exec();
    return docs
      .map((d) => d.toJSON() as DriveFileDocType)
      .filter((f) => f.remoteStatus !== "deleted");
  }

  async moveFileToFolder(id: string, workspaceId: string, localFolderId: string | null = null): Promise<DriveFileDocType | null> {
    const db = await getDatabase();
    const doc = await db.drive_files.findOne(id).exec();
    if (!doc) return null;

    const patched = await doc.incrementalPatch({
      workspaceId: workspaceId.trim(),
      localFolderId: localFolderId ? localFolderId.trim() : "",
      updatedAt: Date.now(),
    });

    return patched.toJSON() as DriveFileDocType;
  }

  async markFilesDeleted(sourceId: string, driveFileIds: string[]): Promise<void> {
    if (driveFileIds.length === 0) return;
    const db = await getDatabase();
    const now = Date.now();
    for (const driveFileId of driveFileIds) {
      const id = `${sourceId}:${driveFileId}`;
      const doc = await db.drive_files.findOne(id).exec();
      if (doc) {
        await doc.incrementalPatch({
          remoteStatus: "deleted",
          updatedAt: now,
        });
      }
    }
  }

  observeFilesForSource(sourceId: string): Observable<DriveFileDocType[]> {
    return new Observable<DriveFileDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.drive_files
            .find({ selector: { sourceId } })
            .$.pipe(
              map((docs) =>
                docs
                  .map((d) => d.toJSON() as DriveFileDocType)
                  .filter((f) => f.remoteStatus !== "deleted"),
              ),
            );

          subscription = query$.subscribe({
            next: (data) => subscriber.next(data),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        })
        .catch((err) => subscriber.error(err));

      return () => {
        isSubscribed = false;
        subscription?.unsubscribe();
      };
    });
  }

  observeAllFiles(): Observable<DriveFileDocType[]> {
    return new Observable<DriveFileDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.drive_files
            .find()
            .$.pipe(
              map((docs) =>
                docs
                  .map((d) => d.toJSON() as DriveFileDocType)
                  .filter((f) => f.remoteStatus !== "deleted"),
              ),
            );

          subscription = query$.subscribe({
            next: (data) => subscriber.next(data),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        })
        .catch((err) => subscriber.error(err));

      return () => {
        isSubscribed = false;
        subscription?.unsubscribe();
      };
    });
  }
}

export const driveFileRepository = new DriveFileRepository();
