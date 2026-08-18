import { map, Observable } from "rxjs";
import { getDatabase } from "../database";
import type { DriveSourceDocType, DriveSourceStatus } from "../types";

export class DriveSourceRepository {
  async getAll(): Promise<DriveSourceDocType[]> {
    const db = await getDatabase();
    const docs = await db.drive_sources.find().exec();
    return docs.map((d) => d.toJSON() as DriveSourceDocType);
  }

  async getById(folderId: string): Promise<DriveSourceDocType | null> {
    const db = await getDatabase();
    const doc = await db.drive_sources.findOne(folderId).exec();
    return doc ? (doc.toJSON() as DriveSourceDocType) : null;
  }

  async getSourcesForWorkspace(workspaceId: string): Promise<DriveSourceDocType[]> {
    const db = await getDatabase();
    const docs = await db.drive_sources.find().exec();
    return docs
      .map((d) => d.toJSON() as DriveSourceDocType)
      .filter((s) => s.workspaceId === workspaceId);
  }

  async addSource(data: {
    folderId: string;
    url: string;
    name: string;
    workspaceId?: string | null;
    fileCount?: number;
  }): Promise<DriveSourceDocType> {
    const db = await getDatabase();
    const folderId = data.folderId.trim();
    const existing = await db.drive_sources.findOne(folderId).exec();

    if (existing) {
      const patched = await existing.incrementalPatch({
        name: data.name.trim() || existing.name,
        url: data.url.trim() || existing.url,
        workspaceId: data.workspaceId !== undefined ? data.workspaceId : existing.workspaceId,
        fileCount: data.fileCount ?? existing.fileCount,
        status: "ready",
        errorMessage: null,
      });
      return patched.toJSON() as DriveSourceDocType;
    }

    const newSource: DriveSourceDocType = {
      id: folderId,
      url: data.url.trim(),
      name: data.name.trim() || "Drive Folder",
      workspaceId: data.workspaceId || null,
      addedAt: Date.now(),
      lastScannedAt: null,
      fileCount: data.fileCount ?? 0,
      status: "ready",
      errorMessage: null,
    };

    const inserted = await db.drive_sources.insert(newSource);
    return inserted.toJSON() as DriveSourceDocType;
  }

  async setWorkspaceForSource(folderId: string, workspaceId: string | null): Promise<DriveSourceDocType | null> {
    const db = await getDatabase();
    const doc = await db.drive_sources.findOne(folderId).exec();
    if (!doc) return null;

    const patched = await doc.incrementalPatch({
      workspaceId,
    });
    return patched.toJSON() as DriveSourceDocType;
  }

  async updateStatus(
    folderId: string,
    status: DriveSourceStatus,
    options?: {
      errorMessage?: string | null;
      fileCount?: number;
      lastScannedAt?: number;
    },
  ): Promise<DriveSourceDocType | null> {
    const db = await getDatabase();
    const doc = await db.drive_sources.findOne(folderId).exec();
    if (!doc) return null;

    const patch: Partial<DriveSourceDocType> = {
      status,
      errorMessage: options?.errorMessage ?? (status === "ready" ? null : doc.errorMessage),
    };

    if (typeof options?.fileCount === "number") {
      patch.fileCount = options.fileCount;
    }

    if (typeof options?.lastScannedAt === "number") {
      patch.lastScannedAt = options.lastScannedAt;
    }

    const patched = await doc.incrementalPatch(patch);
    return patched.toJSON() as DriveSourceDocType;
  }

  async removeSource(folderId: string): Promise<boolean> {
    const db = await getDatabase();
    const doc = await db.drive_sources.findOne(folderId).exec();
    if (!doc) return false;

    // Batch cascade delete associated drive_files
    const files = await db.drive_files
      .find({ selector: { sourceId: folderId } })
      .exec();
    if (files.length > 0) {
      await db.drive_files.bulkRemove(files.map((f) => f.id));
    }

    await doc.remove();
    return true;
  }

  observeSources(): Observable<DriveSourceDocType[]> {
    return new Observable<DriveSourceDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.drive_sources.find().$.pipe(
            map((docs) => docs.map((d) => d.toJSON() as DriveSourceDocType)),
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

  observeById(folderId: string): Observable<DriveSourceDocType | null> {
    return new Observable<DriveSourceDocType | null>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.drive_sources.findOne(folderId).$.pipe(
            map((doc) => (doc ? (doc.toJSON() as DriveSourceDocType) : null)),
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

  observeSourcesForWorkspace(workspaceId: string): Observable<DriveSourceDocType[]> {
    return new Observable<DriveSourceDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.drive_sources.find().$.pipe(
            map((docs) =>
              docs
                .map((d) => d.toJSON() as DriveSourceDocType)
                .filter((s) => s.workspaceId === workspaceId),
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

export const driveSourceRepository = new DriveSourceRepository();
