import { openDB, type DBSchema, type IDBPDatabase } from "idb"

import { type Tag, type TagAssignment } from "./tags.types"

const DB_NAME = "study_materials_tags"
const TAG_STORE = "tags"
const ASSIGN_STORE = "assignments"

interface TagDBSchema extends DBSchema {
  [TAG_STORE]: {
    key: string
    value: Tag
  }
  [ASSIGN_STORE]: {
    key: string
    value: TagAssignment
  }
}

let dbPromise: Promise<IDBPDatabase<TagDBSchema>> | null = null

async function getDB(): Promise<IDBPDatabase<TagDBSchema>> {
  if (!dbPromise) {
    dbPromise = initTagDB()
  }

  return dbPromise
}

function uniqueTagIds(tagIds: readonly string[]): string[] {
  return Array.from(new Set(tagIds.map((id) => id.trim()).filter(Boolean)))
}

export async function initTagDB(): Promise<IDBPDatabase<TagDBSchema>> {
  try {
    return await openDB<TagDBSchema>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TAG_STORE)) {
          db.createObjectStore(TAG_STORE, { keyPath: "id" })
        }

        if (!db.objectStoreNames.contains(ASSIGN_STORE)) {
          db.createObjectStore(ASSIGN_STORE, { keyPath: "fileId" })
        }
      },
    })
  } catch {
    throw new Error("Failed to initialize tag database")
  }
}

export async function getAllTags(): Promise<Tag[]> {
  try {
    const database = await getDB()
    return await database.getAll(TAG_STORE)
  } catch {
    throw new Error("Failed to load tags")
  }
}

export async function getTagById(id: string): Promise<Tag | undefined> {
  try {
    const database = await getDB()
    return await database.get(TAG_STORE, id)
  } catch {
    throw new Error("Failed to load tag")
  }
}

export async function addTag(tag: Tag): Promise<Tag> {
  try {
    const database = await getDB()
    await database.add(TAG_STORE, tag)
    return tag
  } catch {
    throw new Error("Failed to persist tag")
  }
}

export async function updateTag(tag: Tag): Promise<Tag> {
  try {
    const database = await getDB()
    await database.put(TAG_STORE, tag)
    return tag
  } catch {
    throw new Error("Failed to persist tag")
  }
}

export async function deleteTag(id: string): Promise<void> {
  try {
    const database = await getDB()
    await database.delete(TAG_STORE, id)
  } catch {
    throw new Error("Failed to delete tag")
  }
}

export async function getAssignments(): Promise<TagAssignment[]> {
  try {
    const database = await getDB()
    return await database.getAll(ASSIGN_STORE)
  } catch {
    throw new Error("Failed to load assignments")
  }
}

export async function getAssignmentsByFile(
  fileId: string,
): Promise<TagAssignment | undefined> {
  try {
    const database = await getDB()
    return await database.get(ASSIGN_STORE, fileId)
  } catch {
    throw new Error("Failed to load assignments")
  }
}

export async function assignTags(
  fileId: string,
  tagIds: readonly string[],
): Promise<TagAssignment> {
  const assignment: TagAssignment = {
    fileId,
    tagIds: uniqueTagIds(tagIds),
  }

  try {
    const database = await getDB()
    await database.put(ASSIGN_STORE, assignment)
    return assignment
  } catch {
    throw new Error("Failed to persist assignment")
  }
}

export async function removeTags(fileId: string): Promise<void> {
  try {
    const database = await getDB()
    await database.delete(ASSIGN_STORE, fileId)
  } catch {
    throw new Error("Failed to remove assignment")
  }
}
