"use client";

import { deleteDB } from "idb";

import { isOfflineV2Enabled } from "./offline.flags";

const MIGRATION_DONE_KEY = "studytrix.offline_v2.migrated.v1";
const OFFLINE_DB_NAME = "studytrix_offline";
const DOWNLOAD_STORE_KEY = "studytrix-download-store-v1";

export async function runOfflineV2Migration(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isOfflineV2Enabled()) {
    return false;
  }

  const migrated = window.localStorage.getItem(MIGRATION_DONE_KEY);
  if (migrated === "1") {
    return false;
  }

  try {
    await deleteDB(OFFLINE_DB_NAME);
  } catch {
    // Best effort reset.
  }

  try {
    window.localStorage.removeItem(DOWNLOAD_STORE_KEY);
  } catch {
    // Best effort reset.
  }

  window.localStorage.setItem(MIGRATION_DONE_KEY, "1");
  return true;
}
