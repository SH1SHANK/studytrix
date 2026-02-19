import { useCallback, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { useTagStore } from "@/features/tags/tag.store";
import type { Tag } from "@/features/tags/tag.types";

interface UseTagsResult {
  tags: Tag[];
  isHydrated: boolean;
  error: string | null;
  createTag: (name: string, color: string) => Promise<Tag>;
  renameTag: (id: string, newName: string) => Promise<Tag>;
  recolorTag: (id: string, newColor: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
}

export function useTags(): UseTagsResult {
  const initializedRef = useRef(false);

  const {
    tags,
    isHydrated,
    error,
    hydrate,
    addTag,
    renameTag,
    recolorTag,
    removeTag,
  } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
      isHydrated: state.isHydrated,
      error: state.error,
      hydrate: state.hydrate,
      addTag: state.addTag,
      renameTag: state.renameTag,
      recolorTag: state.recolorTag,
      removeTag: state.removeTag,
    })),
  );

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    void hydrate();
  }, [hydrate]);

  const createTag = useCallback(
    async (name: string, color: string) => await addTag(name, color),
    [addTag],
  );

  const rename = useCallback(
    async (id: string, newName: string) => await renameTag(id, newName),
    [renameTag],
  );

  const recolor = useCallback(
    async (id: string, newColor: string) => await recolorTag(id, newColor),
    [recolorTag],
  );

  const deleteTag = useCallback(
    async (id: string) => {
      await removeTag(id);
    },
    [removeTag],
  );

  return {
    tags,
    isHydrated,
    error,
    createTag,
    renameTag: rename,
    recolorTag: recolor,
    deleteTag,
  };
}
