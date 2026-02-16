import { getAssignments } from "./tags.db"
import { TagService } from "./tags.service"
import { type Tag, type TagAssignment } from "./tags.types"

export interface TagStoreState {
  tags: Tag[]
  assignments: Record<string, TagAssignment>
  loadTags(): Promise<void>
  loadAssignments(): Promise<void>
  assignTags(fileId: string, tagIds: string[]): Promise<void>
  removeTags(fileId: string): Promise<void>
  createTag(label: string, color: string): Promise<void>
  updateTag(id: string, data: Partial<Omit<Tag, "id">>): Promise<void>
  deleteTag(id: string): Promise<void>
}

type TagStoreSnapshot = Readonly<{
  tags: Tag[]
  assignments: Record<string, TagAssignment>
}>

type StoreListener = () => void

const tagService = new TagService()

const state: TagStoreState = {
  tags: [],
  assignments: {},

  async loadTags(): Promise<void> {
    const tags = await tagService.getTags()
    setState((prev) => ({
      ...prev,
      tags,
    }))
  },

  async loadAssignments(): Promise<void> {
    const assignments = await getAssignments()

    const byFileId: Record<string, TagAssignment> = {}
    for (const assignment of assignments) {
      byFileId[assignment.fileId] = assignment
    }

    setState((prev) => ({
      ...prev,
      assignments: byFileId,
    }))
  },

  async assignTags(fileId: string, tagIds: string[]): Promise<void> {
    const assignment = await tagService.assignTags(fileId, tagIds)

    setState((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        [fileId]: assignment,
      },
    }))
  },

  async removeTags(fileId: string): Promise<void> {
    await tagService.removeTags(fileId)

    setState((prev) => {
      const nextAssignments = { ...prev.assignments }
      delete nextAssignments[fileId]

      return {
        ...prev,
        assignments: nextAssignments,
      }
    })
  },

  async createTag(label: string, color: string): Promise<void> {
    const created = await tagService.createTag(label, color)

    setState((prev) => ({
      ...prev,
      tags: [...prev.tags, created].sort((a, b) => a.label.localeCompare(b.label)),
    }))
  },

  async updateTag(id: string, data: Partial<Omit<Tag, "id">>): Promise<void> {
    const existing = state.tags.find((tag) => tag.id === id)
    if (!existing) {
      throw new Error("Tag not found")
    }

    let next = existing

    if (typeof data.label === "string" && data.label.trim() !== existing.label) {
      next = await tagService.renameTag(id, data.label)
    }

    if (typeof data.color === "string" && data.color.trim() !== next.color) {
      next = await tagService.recolorTag(id, data.color)
    }

    setState((prev) => ({
      ...prev,
      tags: prev.tags
        .map((tag) => (tag.id === id ? next : tag))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }))
  },

  async deleteTag(id: string): Promise<void> {
    await tagService.deleteTag(id)

    setState((prev) => {
      const nextAssignments: Record<string, TagAssignment> = {}

      for (const assignment of Object.values(prev.assignments)) {
        const nextTagIds = assignment.tagIds.filter((tagId) => tagId !== id)
        if (nextTagIds.length > 0) {
          nextAssignments[assignment.fileId] = {
            fileId: assignment.fileId,
            tagIds: nextTagIds,
          }
        }
      }

      return {
        ...prev,
        tags: prev.tags.filter((tag) => tag.id !== id),
        assignments: nextAssignments,
      }
    })
  },
}

const listeners = new Set<StoreListener>()

function setState(updater: (current: TagStoreState) => TagStoreState): void {
  const next = updater(state)
  state.tags = next.tags
  state.assignments = next.assignments

  for (const listener of listeners) {
    listener()
  }
}

export function subscribeTagStore(listener: StoreListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getTagStoreSnapshot(): TagStoreSnapshot {
  return {
    tags: [...state.tags],
    assignments: { ...state.assignments },
  }
}

export const tagStore: TagStoreState = state
