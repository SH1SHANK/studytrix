import { openDB } from "idb";
import { getDatabase } from "../database";
import type {
  SettingsDocType,
  TagAssignmentDocType,
  TagDocType,
  WorkspaceDocType,
} from "../types";

const MIGRATION_STORAGE_KEY = "studytrix.rxdb_migrated";
const CURRENT_MIGRATION_VERSION = 1;

interface MigrationStatus {
  version: number;
  completedAt: number;
}

function getMigrationStatus(): MigrationStatus | null {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(MIGRATION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MigrationStatus;
  } catch {
    return null;
  }
}

function setMigrationCompleted(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }
  try {
    const status: MigrationStatus = {
      version: CURRENT_MIGRATION_VERSION,
      completedAt: Date.now(),
    };
    localStorage.setItem(MIGRATION_STORAGE_KEY, JSON.stringify(status));
  } catch (error) {
    console.error("[Migration] Failed to save migration status to localStorage", error);
  }
}

/**
 * Migrates legacy localStorage and IndexedDB data into RxDB.
 * Safe and idempotent.
 */
export async function runLegacyMigration(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const status = getMigrationStatus();
  if (status && status.version >= CURRENT_MIGRATION_VERSION) {
    return;
  }

  const db = await getDatabase();

  // 1. Migrate Workspaces from localStorage (Zustand persist key: studytrix_workspaces_v1)
  try {
    const rawWorkspaces = localStorage.getItem("studytrix_workspaces_v1");
    if (rawWorkspaces) {
      const parsed = JSON.parse(rawWorkspaces) as { state?: { workspaces?: unknown[] } };
      const legacyWorkspaces = Array.isArray(parsed?.state?.workspaces) ? parsed.state.workspaces : [];

      const workspacesToInsert: WorkspaceDocType[] = [];
      for (const w of legacyWorkspaces) {
        if (!w || typeof w !== "object") continue;
        const item = w as Record<string, unknown>;
        if (typeof item.id === "string" && typeof item.driveFolderId === "string" && typeof item.name === "string") {
          workspacesToInsert.push({
            id: item.id,
            driveFolderId: item.driveFolderId,
            name: item.name,
            description: typeof item.description === "string" ? item.description : null,
            category: typeof item.category === "string" ? item.category : null,
            color: typeof item.color === "string" ? item.color : "indigo",
            pinned: Boolean(item.pinned),
            itemCount: typeof item.itemCount === "number" ? item.itemCount : null,
            createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
            updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : Date.now(),
          });
        }
      }

      if (workspacesToInsert.length > 0) {
        await db.workspaces.bulkUpsert(workspacesToInsert);
      }
    }
  } catch (error) {
    console.warn("[Migration] Workspace migration warning:", error);
  }

  // 2. Migrate Tags & Tag Assignments from IndexedDB (studytrix_tag_system_v2)
  try {
    if (typeof indexedDB !== "undefined") {
      const tagDb = await openDB("studytrix_tag_system_v2", 1).catch(() => null);
      if (tagDb) {
        // Tags
        if (tagDb.objectStoreNames.contains("tags")) {
          const rawTags = await tagDb.getAll("tags");
          const tagsToInsert: TagDocType[] = [];
          for (const t of rawTags) {
            if (t && typeof t.id === "string" && typeof t.name === "string") {
              tagsToInsert.push({
                id: t.id,
                name: t.name,
                color: t.color || "#4F46E5",
                uses: typeof t.uses === "number" ? t.uses : 0,
                isSystem: Boolean(t.isSystem),
                createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
                updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : Date.now(),
              });
            }
          }
          if (tagsToInsert.length > 0) {
            await db.tags.bulkUpsert(tagsToInsert);
          }
        }

        // Tag Assignments
        if (tagDb.objectStoreNames.contains("assignments")) {
          const rawAssignments = await tagDb.getAll("assignments");
          const assignmentsToInsert: TagAssignmentDocType[] = [];

          for (const a of rawAssignments) {
            if (a && typeof a.entityId === "string" && Array.isArray(a.tagIds)) {
              const entityId = a.entityId;
              const entityType = a.entityType === "folder" ? "folder" : "file";
              const starred = Boolean(a.starred);
              const updatedAt = typeof a.updatedAt === "number" ? a.updatedAt : Date.now();

              for (const tagId of a.tagIds) {
                if (typeof tagId === "string" && tagId.trim()) {
                  assignmentsToInsert.push({
                    id: `${entityId}:${tagId.trim()}`,
                    entityId,
                    entityType,
                    tagId: tagId.trim(),
                    starred,
                    createdAt: updatedAt,
                    updatedAt,
                  });
                }
              }
            }
          }

          if (assignmentsToInsert.length > 0) {
            await db.tag_assignments.bulkUpsert(assignmentsToInsert);
          }
        }

        tagDb.close();
      }
    }
  } catch (error) {
    console.warn("[Migration] Tag system migration warning:", error);
  }

  // 3. Migrate Settings from IndexedDB (app-settings-v2)
  try {
    if (typeof indexedDB !== "undefined") {
      const settingsDb = await openDB("app-settings-v2", 1).catch(() => null);
      if (settingsDb) {
        if (settingsDb.objectStoreNames.contains("settings")) {
          const rawSettings = await settingsDb.getAll("settings");
          const settingsToInsert: SettingsDocType[] = [];

          for (const s of rawSettings) {
            if (s && typeof s.id === "string") {
              settingsToInsert.push({
                id: s.id,
                value: s.value,
                updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : Date.now(),
              });
            }
          }

          if (settingsToInsert.length > 0) {
            await db.settings.bulkUpsert(settingsToInsert);
          }
        }
        settingsDb.close();
      }
    }
  } catch (error) {
    console.warn("[Migration] Settings migration warning:", error);
  }

  // Mark migration complete
  setMigrationCompleted();
}
