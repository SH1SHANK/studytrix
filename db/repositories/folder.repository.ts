import { map, Observable } from "rxjs";
import { getDatabase } from "../database";
import type { FolderDocType, FolderDocument } from "../types";

function generateFolderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `fld_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class FolderRepository {
  async getById(id: string): Promise<FolderDocType | null> {
    const db = await getDatabase();
    const doc = await db.folders.findOne(id).exec();
    return doc ? (doc.toJSON() as FolderDocType) : null;
  }

  async getFoldersInFolder(workspaceId: string, parentFolderId: string | null = null): Promise<FolderDocType[]> {
    const db = await getDatabase();
    const docs = await db.folders
      .find({
        selector: {
          workspaceId: workspaceId.trim(),
          parentFolderId: parentFolderId ? parentFolderId.trim() : "",
        },
        sort: [{ updatedAt: "asc" }],
      })
      .exec();
    return docs.map((d) => d.toJSON() as FolderDocType);
  }

  async getAllFoldersInWorkspace(workspaceId: string): Promise<FolderDocType[]> {
    const db = await getDatabase();
    const docs = await db.folders
      .find({
        selector: { workspaceId: workspaceId.trim() },
        sort: [{ updatedAt: "asc" }],
      })
      .exec();
    return docs.map((d) => d.toJSON() as FolderDocType);
  }

  async createFolder(data: {
    workspaceId: string;
    parentFolderId?: string | null;
    name: string;
    color?: string | null;
  }): Promise<FolderDocType> {
    const db = await getDatabase();
    const now = Date.now();
    const folder: FolderDocType = {
      id: generateFolderId(),
      workspaceId: data.workspaceId.trim(),
      parentFolderId: data.parentFolderId ? data.parentFolderId.trim() : "",
      name: data.name.trim() || "New Folder",
      color: data.color || null,
      createdAt: now,
      updatedAt: now,
    };

    const inserted = await db.folders.insert(folder);
    return inserted.toJSON() as FolderDocType;
  }

  async renameFolder(id: string, newName: string): Promise<FolderDocType | null> {
    const db = await getDatabase();
    const doc = await db.folders.findOne(id).exec();
    if (!doc) return null;

    const patched = await doc.incrementalPatch({
      name: newName.trim() || doc.name,
      updatedAt: Date.now(),
    });

    return patched.toJSON() as FolderDocType;
  }

  async moveFolder(id: string, newParentFolderId: string | null): Promise<FolderDocType | null> {
    const db = await getDatabase();
    const doc = await db.folders.findOne(id).exec();
    if (!doc) return null;

    // Prevent moving folder into itself
    if (id === newParentFolderId) {
      return doc.toJSON() as FolderDocType;
    }

    const patched = await doc.incrementalPatch({
      parentFolderId: newParentFolderId ? newParentFolderId.trim() : "",
      updatedAt: Date.now(),
    });

    return patched.toJSON() as FolderDocType;
  }

  async deleteFolder(id: string): Promise<boolean> {
    const db = await getDatabase();
    const doc = await db.folders.findOne(id).exec();
    if (!doc) return false;

    // 1. Find all descendant folder IDs recursively
    const allWorkspaceFolders = await db.folders
      .find({ selector: { workspaceId: doc.workspaceId } })
      .exec();

    const descendantIds = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of allWorkspaceFolders) {
        if (f.parentFolderId && descendantIds.has(f.parentFolderId) && !descendantIds.has(f.id)) {
          descendantIds.add(f.id);
          added = true;
        }
      }
    }

    // 2. Cascade delete all descendant folders
    await db.folders.bulkRemove(Array.from(descendantIds));

    // 3. Unlink localFolderId from drive_files belonging to these deleted folders (safe local detach)
    const filesInFolders = await db.drive_files
      .find({
        selector: {
          localFolderId: { $in: Array.from(descendantIds) },
        },
      })
      .exec();

    if (filesInFolders.length > 0) {
      const now = Date.now();
      await Promise.all(
        filesInFolders.map((f) =>
          f.incrementalPatch({
            localFolderId: "",
            updatedAt: now,
          }),
        ),
      );
    }

    return true;
  }

  async getFolderPath(folderId: string): Promise<{ id: string; name: string }[]> {
    const db = await getDatabase();
    const path: { id: string; name: string }[] = [];
    let currentId: string | null = folderId;
    const visited = new Set<string>();

    while (currentId && currentId !== "" && !visited.has(currentId)) {
      visited.add(currentId);
      const doc: FolderDocument | null = await db.folders.findOne(currentId).exec();
      if (!doc) break;
      path.unshift({ id: doc.id, name: doc.name });
      currentId = doc.parentFolderId || null;
    }

    return path;
  }

  observeFoldersInFolder(workspaceId: string, parentFolderId: string | null = null): Observable<FolderDocType[]> {
    return new Observable<FolderDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.folders
            .find({
              selector: {
                workspaceId: workspaceId.trim(),
                parentFolderId: parentFolderId ? parentFolderId.trim() : "",
              },
              sort: [{ updatedAt: "asc" }],
            })
            .$.pipe(map((docs) => docs.map((d) => d.toJSON() as FolderDocType)));

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

  observeAllFoldersInWorkspace(workspaceId: string): Observable<FolderDocType[]> {
    return new Observable<FolderDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.folders
            .find({
              selector: { workspaceId: workspaceId.trim() },
              sort: [{ updatedAt: "asc" }],
            })
            .$.pipe(map((docs) => docs.map((d) => d.toJSON() as FolderDocType)));

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

export const folderRepository = new FolderRepository();
