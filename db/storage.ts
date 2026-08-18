import type { RxStorage } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { getRxStorageMemory } from "rxdb/plugins/storage-memory";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";

/**
 * Pluggable RxDB Storage Selector.
 *
 * Production (browser): Uses `getRxStorageDexie()` directly for maximum IndexedDB throughput and zero AJV validator bundle bloat.
 * Development / Test: Wraps storage with `wrappedValidateAjvStorage` for runtime schema error detection.
 * SSR: Throws explicit error if attempted during server rendering.
 */
export function getStorage(isTest = false): RxStorage<any, any> {
  if (isTest || process.env.NODE_ENV === "test") {
    const memory = getRxStorageMemory();
    return wrappedValidateAjvStorage({ storage: memory });
  }

  if (typeof window === "undefined") {
    throw new Error(
      "[RxDB] Database storage must not be initialized during Server-Side Rendering (SSR). Ensure database calls occur within client-side components or lifecycle effects.",
    );
  }

  const dexie = getRxStorageDexie();
  if (process.env.NODE_ENV === "development") {
    return wrappedValidateAjvStorage({ storage: dexie });
  }

  return dexie;
}
