import * as db from "./tags.db"
import { type Tag, type TagAssignment } from "./tags.types"

type AssignmentListener = {
  resolve: (value: TagAssignment) => void
  reject: (error: Error) => void
}

type RemoveListener = {
  resolve: () => void
  reject: (error: Error) => void
}

type PendingAssignment = {
  fileId: string
  tagIds: string[]
  timer: ReturnType<typeof setTimeout>
  listeners: AssignmentListener[]
}

type PendingRemoval = {
  fileId: string
  timer: ReturnType<typeof setTimeout>
  listeners: RemoveListener[]
}

const ASSIGNMENT_DEBOUNCE_MS = 120

function uniqueTagIds(tagIds: readonly string[]): string[] {
  return Array.from(new Set(tagIds.map((id) => id.trim()).filter(Boolean)))
}

function makeTagId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `tag-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

export class TagService {
  private pendingAssignments = new Map<string, PendingAssignment>()

  private pendingRemovals = new Map<string, PendingRemoval>()

  async getTags(): Promise<Tag[]> {
    const tags = await db.getAllTags()
    return [...tags].sort((a, b) => a.label.localeCompare(b.label))
  }

  async createTag(label: string, color: string): Promise<Tag> {
    const normalizedLabel = label.trim()
    const normalizedColor = color.trim()

    if (!normalizedLabel || !normalizedColor) {
      throw new Error("Failed to persist tag")
    }

    const tag: Tag = {
      id: makeTagId(),
      label: normalizedLabel,
      color: normalizedColor,
    }

    return db.addTag(tag)
  }

  async renameTag(id: string, label: string): Promise<Tag> {
    const existing = await db.getTagById(id)
    if (!existing) {
      throw new Error("Tag not found")
    }

    const nextLabel = label.trim()
    if (!nextLabel) {
      throw new Error("Failed to persist tag")
    }

    const updated: Tag = {
      ...existing,
      label: nextLabel,
    }

    return db.updateTag(updated)
  }

  async recolorTag(id: string, color: string): Promise<Tag> {
    const existing = await db.getTagById(id)
    if (!existing) {
      throw new Error("Tag not found")
    }

    const nextColor = color.trim()
    if (!nextColor) {
      throw new Error("Failed to persist tag")
    }

    const updated: Tag = {
      ...existing,
      color: nextColor,
    }

    return db.updateTag(updated)
  }

  async deleteTag(id: string): Promise<void> {
    const existing = await db.getTagById(id)
    if (!existing) {
      throw new Error("Tag not found")
    }

    await db.deleteTag(id)

    const assignments = await db.getAssignments()

    await Promise.all(
      assignments.map(async (assignment) => {
        const nextTagIds = assignment.tagIds.filter((tagId) => tagId !== id)

        if (nextTagIds.length === 0) {
          await db.removeTags(assignment.fileId)
          return
        }

        await db.assignTags(assignment.fileId, nextTagIds)
      }),
    )
  }

  async getTagAssignments(fileId: string): Promise<TagAssignment | null> {
    const assignment = await db.getAssignmentsByFile(fileId)
    return assignment ?? null
  }

  async assignTags(fileId: string, tagIds: string[]): Promise<TagAssignment> {
    const normalized = uniqueTagIds(tagIds)

    if (normalized.length === 0) {
      return {
        fileId,
        tagIds: [],
      }
    }

    const allTags = await db.getAllTags()
    const existingIds = new Set(allTags.map((tag) => tag.id))

    const hasMissingTag = normalized.some((tagId) => !existingIds.has(tagId))
    if (hasMissingTag) {
      throw new Error("Tag not found")
    }

    return this.scheduleAssignment(fileId, normalized)
  }

  async removeTags(fileId: string): Promise<void> {
    await this.scheduleRemoval(fileId)
  }

  private scheduleAssignment(fileId: string, tagIds: string[]): Promise<TagAssignment> {
    return new Promise<TagAssignment>((resolve, reject) => {
      const existing = this.pendingAssignments.get(fileId)

      if (existing) {
        clearTimeout(existing.timer)
        existing.tagIds = [...tagIds]
        existing.listeners.push({ resolve, reject })

        existing.timer = setTimeout(async () => {
          try {
            const persisted = await db.assignTags(fileId, existing.tagIds)
            for (const listener of existing.listeners) {
              listener.resolve(persisted)
            }
          } catch {
            const error = new Error("Failed to persist assignment")
            for (const listener of existing.listeners) {
              listener.reject(error)
            }
          } finally {
            this.pendingAssignments.delete(fileId)
          }
        }, ASSIGNMENT_DEBOUNCE_MS)

        this.pendingAssignments.set(fileId, existing)
        return
      }

      const pending: PendingAssignment = {
        fileId,
        tagIds: [...tagIds],
        listeners: [{ resolve, reject }],
        timer: setTimeout(async () => {
          try {
            const persisted = await db.assignTags(fileId, pending.tagIds)
            for (const listener of pending.listeners) {
              listener.resolve(persisted)
            }
          } catch {
            const error = new Error("Failed to persist assignment")
            for (const listener of pending.listeners) {
              listener.reject(error)
            }
          } finally {
            this.pendingAssignments.delete(fileId)
          }
        }, ASSIGNMENT_DEBOUNCE_MS),
      }

      this.pendingAssignments.set(fileId, pending)
    })
  }

  private scheduleRemoval(fileId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const existing = this.pendingRemovals.get(fileId)

      if (existing) {
        clearTimeout(existing.timer)
        existing.listeners.push({ resolve, reject })

        existing.timer = setTimeout(async () => {
          try {
            await db.removeTags(fileId)
            for (const listener of existing.listeners) {
              listener.resolve()
            }
          } catch {
            const error = new Error("Failed to remove assignment")
            for (const listener of existing.listeners) {
              listener.reject(error)
            }
          } finally {
            this.pendingRemovals.delete(fileId)
          }
        }, ASSIGNMENT_DEBOUNCE_MS)

        this.pendingRemovals.set(fileId, existing)
        return
      }

      const pending: PendingRemoval = {
        fileId,
        listeners: [{ resolve, reject }],
        timer: setTimeout(async () => {
          try {
            await db.removeTags(fileId)
            for (const listener of pending.listeners) {
              listener.resolve()
            }
          } catch {
            const error = new Error("Failed to remove assignment")
            for (const listener of pending.listeners) {
              listener.reject(error)
            }
          } finally {
            this.pendingRemovals.delete(fileId)
          }
        }, ASSIGNMENT_DEBOUNCE_MS),
      }

      this.pendingRemovals.set(fileId, pending)
    })
  }
}
