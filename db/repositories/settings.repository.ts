import { map, Observable } from "rxjs";
import { getDatabase } from "../database";
import type { SettingsDocType } from "../types";

export class SettingsRepository {
  async get(id: string): Promise<unknown | null> {
    const db = await getDatabase();
    const doc = await db.settings.findOne(id).exec();
    return doc ? doc.value : null;
  }

  async getAll(): Promise<Record<string, unknown>> {
    const db = await getDatabase();
    const docs = await db.settings.find().exec();
    const result: Record<string, unknown> = {};
    for (const doc of docs) {
      result[doc.id] = doc.value;
    }
    return result;
  }

  async set(id: string, value: unknown): Promise<void> {
    const db = await getDatabase();
    const now = Date.now();
    await db.settings.upsert({
      id,
      value,
      updatedAt: now,
    });
  }

  async bulkUpsert(settings: SettingsDocType[]): Promise<void> {
    if (settings.length === 0) return;
    const db = await getDatabase();
    await db.settings.bulkUpsert(settings);
  }

  async reset(): Promise<void> {
    const db = await getDatabase();
    const docs = await db.settings.find().exec();
    await Promise.all(docs.map((d) => d.remove()));
  }

  observe(id: string): Observable<unknown | null> {
    return new Observable<unknown | null>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.settings.findOne(id).$.pipe(
            map((doc) => (doc ? doc.value : null)),
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

export const settingsRepository = new SettingsRepository();
