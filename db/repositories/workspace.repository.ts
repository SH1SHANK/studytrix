import { map, Observable } from "rxjs";
import { getDatabase } from "../database";
import type { WorkspaceDocType } from "../types";

function generateWorkspaceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class WorkspaceRepository {
  async getAll(): Promise<WorkspaceDocType[]> {
    const db = await getDatabase();
    const docs = await db.workspaces.find().exec();
    return docs.map((doc) => doc.toJSON() as WorkspaceDocType);
  }

  async getById(id: string): Promise<WorkspaceDocType | null> {
    const db = await getDatabase();
    const doc = await db.workspaces.findOne(id).exec();
    return doc ? (doc.toJSON() as WorkspaceDocType) : null;
  }

  async create(data: Omit<WorkspaceDocType, "id" | "createdAt" | "updatedAt">): Promise<WorkspaceDocType> {
    const db = await getDatabase();
    const now = Date.now();
    const newDoc: WorkspaceDocType = {
      id: generateWorkspaceId(),
      driveFolderId: data.driveFolderId.trim(),
      name: data.name.trim() || "Untitled Workspace",
      description: data.description?.trim() || null,
      category: data.category?.trim() || null,
      color: data.color || "indigo",
      pinned: Boolean(data.pinned),
      itemCount: data.itemCount ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const inserted = await db.workspaces.insert(newDoc);
    return inserted.toJSON() as WorkspaceDocType;
  }

  async update(id: string, updates: Partial<Omit<WorkspaceDocType, "id" | "createdAt">>): Promise<WorkspaceDocType | null> {
    const db = await getDatabase();
    const doc = await db.workspaces.findOne(id).exec();
    if (!doc) return null;

    const patched = await doc.incrementalPatch({
      ...updates,
      updatedAt: Date.now(),
    });

    return patched.toJSON() as WorkspaceDocType;
  }

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const doc = await db.workspaces.findOne(id).exec();
    if (!doc) return false;

    await doc.remove();
    return true;
  }

  async togglePin(id: string): Promise<WorkspaceDocType | null> {
    const db = await getDatabase();
    const doc = await db.workspaces.findOne(id).exec();
    if (!doc) return null;

    const patched = await doc.incrementalPatch({
      pinned: !doc.pinned,
      updatedAt: Date.now(),
    });

    return patched.toJSON() as WorkspaceDocType;
  }

  async bulkUpsert(workspaces: WorkspaceDocType[]): Promise<void> {
    if (workspaces.length === 0) return;
    const db = await getDatabase();
    await db.workspaces.bulkUpsert(workspaces);
  }

  observeAll(): Observable<WorkspaceDocType[]> {
    return new Observable<WorkspaceDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.workspaces.find().$.pipe(
            map((docs) => docs.map((d) => d.toJSON() as WorkspaceDocType)),
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

  observeById(id: string): Observable<WorkspaceDocType | null> {
    return new Observable<WorkspaceDocType | null>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.workspaces.findOne(id).$.pipe(
            map((doc) => (doc ? (doc.toJSON() as WorkspaceDocType) : null)),
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

export const workspaceRepository = new WorkspaceRepository();
