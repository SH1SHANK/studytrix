import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { Tag, TagAssignment } from "./tag.types";

const DB_NAME = "studytrix_tag_system_v2";
const DB_VERSION = 1;
const TAG_STORE = "tags";
const ASSIGNMENT_STORE = "assignments";
const INDEX_TAG_NAME_LOWER = "byNameLower";
const INDEX_ASSIGNMENT_TAG_ID = "byTagId";
const INDEX_ASSIGNMENT_STARRED = "byStarred";
const INDEX_ASSIGNMENT_ENTITY_TYPE = "byEntityType";

type TagRecord = Tag & {
  nameLower: string;
};

type TagAssignmentRecord = TagAssignment & {
  starredValue: 0 | 1;
};

interface TagDbSchema extends DBSchema {
  [TAG_STORE]: {
    key: string;
    value: TagRecord;
    indexes: {
      [INDEX_TAG_NAME_LOWER]: string;
    };
  };
  [ASSIGNMENT_STORE]: {
    key: string;
    value: TagAssignmentRecord;
    indexes: {
      [INDEX_ASSIGNMENT_TAG_ID]: string;
      [INDEX_ASSIGNMENT_STARRED]: number;
      [INDEX_ASSIGNMENT_ENTITY_TYPE]: string;
    };
  };
}

class TagDbError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TagDbError";
  }
}

let dbPromise: Promise<IDBPDatabase<TagDbSchema>> | null = null;

function assertIndexedDbAvailable(): void {
  if (typeof indexedDB === "undefined") {
    throw new TagDbError("IndexedDB is unavailable in this environment");
  }
}

function toTagRecord(tag: Tag): TagRecord {
  return {
    ...tag,
    nameLower: tag.name.toLocaleLowerCase(),
  };
}

function fromTagRecord(tag: TagRecord): Tag {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt,
    uses: tag.uses,
    updatedAt: tag.updatedAt,
    isSystem: tag.isSystem,
  };
}

async function getDb(): Promise<IDBPDatabase<TagDbSchema>> {
  assertIndexedDbAvailable();

  if (!dbPromise) {
    dbPromise = openDB<TagDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TAG_STORE)) {
          const tagStore = db.createObjectStore(TAG_STORE, { keyPath: "id" });
          tagStore.createIndex(INDEX_TAG_NAME_LOWER, "nameLower", { unique: true });
        }

        if (!db.objectStoreNames.contains(ASSIGNMENT_STORE)) {
          const assignmentStore = db.createObjectStore(ASSIGNMENT_STORE, {
            keyPath: "entityId",
          });
          assignmentStore.createIndex(INDEX_ASSIGNMENT_TAG_ID, "tagIds", {
            multiEntry: true,
          });
          assignmentStore.createIndex(INDEX_ASSIGNMENT_STARRED, "starredValue");
          assignmentStore.createIndex(INDEX_ASSIGNMENT_ENTITY_TYPE, "entityType");
        }
      },
      blocked() {
        console.error("Tag DB upgrade blocked by another open tab");
      },
      blocking() {
        console.error("Tag DB is blocking a newer version upgrade");
      },
      terminated() {
        dbPromise = null;
        console.error("Tag DB connection was terminated");
      },
    });
  }

  return dbPromise;
}

function normalizeEntityId(entityId: string): string {
  return entityId.trim();
}

function normalizeTagIds(tagIds: readonly string[]): string[] {
  return Array.from(new Set(tagIds.map((tagId) => tagId.trim()).filter(Boolean)));
}

function toAssignmentRecord(assignment: TagAssignment): TagAssignmentRecord {
  return {
    ...assignment,
    starredValue: assignment.starred ? 1 : 0,
  };
}

function fromAssignmentRecord(record: TagAssignmentRecord): TagAssignment {
  return {
    entityId: record.entityId,
    entityType: record.entityType,
    tagIds: [...record.tagIds],
    starred: record.starred,
    updatedAt: record.updatedAt,
  };
}

function mapDbError(message: string, error: unknown): TagDbError {
  return new TagDbError(message, { cause: error });
}

export async function getTag(id: string): Promise<Tag | null> {
  try {
    const db = await getDb();
    const record = await db.get(TAG_STORE, id);
    return record ? fromTagRecord(record) : null;
  } catch (error) {
    throw mapDbError("Failed to load tag", error);
  }
}

export async function getAllTags(): Promise<Tag[]> {
  try {
    const db = await getDb();
    const records = await db.getAll(TAG_STORE);
    return records.map(fromTagRecord);
  } catch (error) {
    throw mapDbError("Failed to load tags", error);
  }
}

export async function createTag(tag: Tag): Promise<Tag> {
  try {
    const db = await getDb();
    const tx = db.transaction(TAG_STORE, "readwrite");
    await tx.store.add(toTagRecord(tag));
    await tx.done;
    return tag;
  } catch (error) {
    throw mapDbError("Failed to create tag", error);
  }
}

export async function updateTag(tag: Tag): Promise<Tag> {
  try {
    const db = await getDb();
    const tx = db.transaction(TAG_STORE, "readwrite");
    await tx.store.put(toTagRecord(tag));
    await tx.done;
    return tag;
  } catch (error) {
    throw mapDbError("Failed to update tag", error);
  }
}

export async function deleteTag(id: string): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(TAG_STORE, "readwrite");
    await tx.store.delete(id);
    await tx.done;
  } catch (error) {
    throw mapDbError("Failed to delete tag", error);
  }
}

export async function getAssignments(entityId: string): Promise<TagAssignment | null> {
  const normalizedEntityId = normalizeEntityId(entityId);
  if (!normalizedEntityId) {
    return null;
  }

  try {
    const db = await getDb();
    const assignment = await db.get(ASSIGNMENT_STORE, normalizedEntityId);
    return assignment ? fromAssignmentRecord(assignment) : null;
  } catch (error) {
    throw mapDbError("Failed to load assignment", error);
  }
}

export async function getAllAssignments(): Promise<TagAssignment[]> {
  try {
    const db = await getDb();
    const assignments = await db.getAll(ASSIGNMENT_STORE);
    return assignments.map(fromAssignmentRecord);
  } catch (error) {
    throw mapDbError("Failed to load assignments", error);
  }
}

export async function upsertAssignment(assignment: TagAssignment): Promise<TagAssignment> {
  const normalizedEntityId = normalizeEntityId(assignment.entityId);
  const normalizedTagIds = normalizeTagIds(assignment.tagIds);

  const nextAssignment: TagAssignment = {
    ...assignment,
    entityId: normalizedEntityId,
    tagIds: normalizedTagIds,
  };

  try {
    const db = await getDb();
    const tx = db.transaction(ASSIGNMENT_STORE, "readwrite");
    await tx.store.put(toAssignmentRecord(nextAssignment));
    await tx.done;
    return nextAssignment;
  } catch (error) {
    throw mapDbError("Failed to upsert assignment", error);
  }
}

export async function removeAssignment(entityId: string): Promise<void> {
  const normalizedEntityId = normalizeEntityId(entityId);
  if (!normalizedEntityId) {
    return;
  }

  try {
    const db = await getDb();
    const tx = db.transaction(ASSIGNMENT_STORE, "readwrite");
    await tx.store.delete(normalizedEntityId);
    await tx.done;
  } catch (error) {
    throw mapDbError("Failed to remove assignment", error);
  }
}

export async function getEntitiesByTag(tagId: string): Promise<string[]> {
  const normalizedTagId = tagId.trim();
  if (!normalizedTagId) {
    return [];
  }

  try {
    const db = await getDb();
    const tx = db.transaction(ASSIGNMENT_STORE, "readonly");
    const index = tx.store.index(INDEX_ASSIGNMENT_TAG_ID);
    const assignments = await index.getAll(normalizedTagId);
    await tx.done;

    return Array.from(
      new Set(assignments.map((assignment) => assignment.entityId).filter(Boolean)),
    );
  } catch (error) {
    throw mapDbError("Failed to query entities by tag", error);
  }
}
