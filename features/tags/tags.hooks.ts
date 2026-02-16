import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react"

import {
  getTagStoreSnapshot,
  subscribeTagStore,
  tagStore,
} from "./tags.store"
import { type Tag } from "./tags.types"

export function useTags(): {
  tags: Tag[]
  createTag(label: string, color: string): Promise<void>
  updateTag(id: string, label: string, color: string): Promise<void>
  deleteTag(id: string): Promise<void>
} {
  const snapshot = useSyncExternalStore(subscribeTagStore, getTagStoreSnapshot)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    void tagStore.loadTags()
    void tagStore.loadAssignments()
  }, [])

  const createTag = useCallback(async (label: string, color: string) => {
    await tagStore.createTag(label, color)
  }, [])

  const updateTag = useCallback(async (id: string, label: string, color: string) => {
    await tagStore.updateTag(id, { label, color })
  }, [])

  const deleteTag = useCallback(async (id: string) => {
    await tagStore.deleteTag(id)
  }, [])

  return useMemo(
    () => ({
      tags: snapshot.tags,
      createTag,
      updateTag,
      deleteTag,
    }),
    [createTag, deleteTag, snapshot.tags, updateTag],
  )
}

export function useTagAssignments(fileId: string): {
  tagIds: string[]
  assign(tagId: string): Promise<void>
  remove(tagId: string): Promise<void>
} {
  const snapshot = useSyncExternalStore(subscribeTagStore, getTagStoreSnapshot)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    void tagStore.loadAssignments()
  }, [])

  const assignment = snapshot.assignments[fileId]
  const tagIds = useMemo(() => assignment?.tagIds ?? [], [assignment])

  const assign = useCallback(
    async (tagId: string) => {
      const nextIds = Array.from(new Set([...tagIds, tagId]))
      await tagStore.assignTags(fileId, nextIds)
    },
    [fileId, tagIds],
  )

  const remove = useCallback(
    async (tagId: string) => {
      const nextIds = tagIds.filter((id) => id !== tagId)
      if (nextIds.length === 0) {
        await tagStore.removeTags(fileId)
        return
      }

      await tagStore.assignTags(fileId, nextIds)
    },
    [fileId, tagIds],
  )

  return useMemo(
    () => ({
      tagIds,
      assign,
      remove,
    }),
    [assign, remove, tagIds],
  )
}
