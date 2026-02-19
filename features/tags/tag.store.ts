import { create } from "zustand";

import { sortTagsByAnalytics } from "./tag.analytics";
import { TagService } from "./tag.service";
import type { EntityType, FilterMode, Tag, TagAssignment } from "./tag.types";

const tagService = new TagService();

export interface TagStoreState {
  tags: Tag[];
  assignments: Record<string, TagAssignment>;
  activeFilters: string[];
  filterMode: FilterMode;
  starredEntities: Set<string>;
  isHydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addTag: (name: string, color: string) => Promise<Tag>;
  renameTag: (id: string, newName: string) => Promise<Tag>;
  recolorTag: (id: string, newColor: string) => Promise<Tag>;
  removeTag: (id: string) => Promise<void>;
  assignTag: (entityId: string, tagId: string, entityType?: EntityType) => Promise<void>;
  removeTagFromEntity: (entityId: string, tagId: string) => Promise<void>;
  toggleStar: (entityId: string) => Promise<void>;
  setFilterMode: (mode: FilterMode) => void;
  toggleFilter: (tagId: string) => void;
  clearFilters: () => void;
}

function cloneAssignmentMap(
  assignments: Record<string, TagAssignment>,
): Record<string, TagAssignment> {
  const next: Record<string, TagAssignment> = {};

  for (const [entityId, assignment] of Object.entries(assignments)) {
    next[entityId] = {
      ...assignment,
      tagIds: [...assignment.tagIds],
    };
  }

  return next;
}

function buildStarredEntities(assignments: Record<string, TagAssignment>): Set<string> {
  const starred = new Set<string>();

  for (const assignment of Object.values(assignments)) {
    if (assignment.starred) {
      starred.add(assignment.entityId);
    }
  }

  return starred;
}

function toAssignmentMap(assignments: TagAssignment[]): Record<string, TagAssignment> {
  const map: Record<string, TagAssignment> = {};

  for (const assignment of assignments) {
    map[assignment.entityId] = assignment;
  }

  return map;
}

function withOptimisticError(
  error: unknown,
  fallbackMessage: string,
): { message: string; error: Error } {
  if (error instanceof Error) {
    return {
      message: error.message,
      error,
    };
  }

  return {
    message: fallbackMessage,
    error: new Error(fallbackMessage),
  };
}

export const useTagStore = create<TagStoreState>((set, get) => ({
  tags: [],
  assignments: {},
  activeFilters: [],
  filterMode: "OR",
  starredEntities: new Set<string>(),
  isHydrated: false,
  error: null,

  hydrate: async (): Promise<void> => {
    try {
      const [tags, assignments] = await Promise.all([
        tagService.listTags(),
        tagService.listAssignments(),
      ]);
      const assignmentMap = toAssignmentMap(assignments);

      set({
        tags,
        assignments: assignmentMap,
        starredEntities: buildStarredEntities(assignmentMap),
        isHydrated: true,
        error: null,
      });
    } catch (error) {
      const mapped = withOptimisticError(error, "Failed to hydrate tags");
      set({ error: mapped.message });
      throw mapped.error;
    }
  },

  addTag: async (name: string, color: string): Promise<Tag> => {
    const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const now = Date.now();
    const optimisticTag: Tag = {
      id: tempId,
      name: name.trim(),
      color: color.trim().toUpperCase(),
      createdAt: now,
      updatedAt: now,
      uses: 0,
      isSystem: false,
    };

    const previousTags = get().tags;

    set({
      tags: sortTagsByAnalytics([...previousTags, optimisticTag]),
      error: null,
    });

    try {
      const created = await tagService.createTag(name, color);
      set((state) => ({
        tags: sortTagsByAnalytics(
          state.tags.map((tag) => (tag.id === tempId ? created : tag)),
        ),
      }));
      return created;
    } catch (error) {
      set({ tags: previousTags });
      const mapped = withOptimisticError(error, "Failed to create tag");
      set({ error: mapped.message });
      throw mapped.error;
    }
  },

  renameTag: async (id: string, newName: string): Promise<Tag> => {
    const previousTags = get().tags;

    set((state) => ({
      tags: state.tags.map((tag) =>
        tag.id === id
          ? {
              ...tag,
              name: newName.trim(),
              updatedAt: Date.now(),
            }
          : tag,
      ),
      error: null,
    }));

    try {
      const updated = await tagService.renameTag(id, newName);
      set((state) => ({
        tags: sortTagsByAnalytics(
          state.tags.map((tag) => (tag.id === id ? updated : tag)),
        ),
      }));
      return updated;
    } catch (error) {
      set({ tags: previousTags });
      const mapped = withOptimisticError(error, "Failed to rename tag");
      set({ error: mapped.message });
      throw mapped.error;
    }
  },

  recolorTag: async (id: string, newColor: string): Promise<Tag> => {
    const previousTags = get().tags;

    set((state) => ({
      tags: state.tags.map((tag) =>
        tag.id === id
          ? {
              ...tag,
              color: newColor.trim().toUpperCase(),
              updatedAt: Date.now(),
            }
          : tag,
      ),
      error: null,
    }));

    try {
      const updated = await tagService.recolorTag(id, newColor);
      set((state) => ({
        tags: sortTagsByAnalytics(
          state.tags.map((tag) => (tag.id === id ? updated : tag)),
        ),
      }));
      return updated;
    } catch (error) {
      set({ tags: previousTags });
      const mapped = withOptimisticError(error, "Failed to recolor tag");
      set({ error: mapped.message });
      throw mapped.error;
    }
  },

  removeTag: async (id: string): Promise<void> => {
    const previousTags = get().tags;
    const previousAssignments = cloneAssignmentMap(get().assignments);
    const previousFilters = [...get().activeFilters];
    const previousStars = new Set(get().starredEntities);

    const nextAssignments: Record<string, TagAssignment> = {};
    for (const assignment of Object.values(previousAssignments)) {
      const nextTagIds = assignment.tagIds.filter((tagId) => tagId !== id);
      if (nextTagIds.length === 0 && !assignment.starred) {
        continue;
      }

      nextAssignments[assignment.entityId] = {
        ...assignment,
        tagIds: nextTagIds,
        updatedAt: Date.now(),
      };
    }

    set({
      tags: previousTags.filter((tag) => tag.id !== id),
      assignments: nextAssignments,
      activeFilters: previousFilters.filter((tagId) => tagId !== id),
      starredEntities: buildStarredEntities(nextAssignments),
      error: null,
    });

    try {
      await tagService.deleteTag(id);
    } catch (error) {
      set({
        tags: previousTags,
        assignments: previousAssignments,
        activeFilters: previousFilters,
        starredEntities: previousStars,
      });
      const mapped = withOptimisticError(error, "Failed to delete tag");
      set({ error: mapped.message });
      throw mapped.error;
    }
  },

  assignTag: async (
    entityId: string,
    tagId: string,
    entityType: EntityType = "file",
  ): Promise<void> => {
    const previousAssignments = cloneAssignmentMap(get().assignments);
    const previousTags = [...get().tags];

    const existing = previousAssignments[entityId];
    const optimisticAssignment: TagAssignment = {
      entityId,
      entityType: existing?.entityType ?? entityType,
      tagIds: Array.from(new Set([...(existing?.tagIds ?? []), tagId])),
      starred: existing?.starred ?? false,
      updatedAt: Date.now(),
    };

    const nextTags = previousTags.map((tag) =>
      tag.id === tagId
        ? {
            ...tag,
            uses: existing?.tagIds.includes(tagId) ? tag.uses : tag.uses + 1,
            updatedAt: Date.now(),
          }
        : tag,
    );

    set({
      assignments: {
        ...previousAssignments,
        [entityId]: optimisticAssignment,
      },
      tags: sortTagsByAnalytics(nextTags),
      starredEntities: buildStarredEntities({
        ...previousAssignments,
        [entityId]: optimisticAssignment,
      }),
      error: null,
    });

    try {
      if (entityType === "folder") {
        await tagService.assignTagToFolder(entityId, tagId);
      } else {
        await tagService.assignTag(entityId, tagId);
      }

      const [persistedAssignment, tags] = await Promise.all([
        tagService.getAssignment(entityId),
        tagService.listTags(),
      ]);

      set((state) => {
        const assignments = { ...state.assignments };
        if (persistedAssignment) {
          assignments[entityId] = persistedAssignment;
        } else {
          delete assignments[entityId];
        }

        return {
          assignments,
          tags,
          starredEntities: buildStarredEntities(assignments),
        };
      });
    } catch (error) {
      set({
        assignments: previousAssignments,
        tags: previousTags,
        starredEntities: buildStarredEntities(previousAssignments),
      });
      const mapped = withOptimisticError(error, "Failed to assign tag");
      set({ error: mapped.message });
      throw mapped.error;
    }
  },

  removeTagFromEntity: async (entityId: string, tagId: string): Promise<void> => {
    const previousAssignments = cloneAssignmentMap(get().assignments);

    const existing = previousAssignments[entityId];
    if (!existing) {
      return;
    }

    const nextTagIds = existing.tagIds.filter((id) => id !== tagId);
    const nextAssignments = { ...previousAssignments };

    if (nextTagIds.length === 0 && !existing.starred) {
      delete nextAssignments[entityId];
    } else {
      nextAssignments[entityId] = {
        ...existing,
        tagIds: nextTagIds,
        updatedAt: Date.now(),
      };
    }

    set({
      assignments: nextAssignments,
      starredEntities: buildStarredEntities(nextAssignments),
      error: null,
    });

    try {
      await tagService.removeTag(entityId, tagId);

      const persisted = await tagService.getAssignment(entityId);
      set((state) => {
        const assignments = { ...state.assignments };
        if (persisted) {
          assignments[entityId] = persisted;
        } else {
          delete assignments[entityId];
        }

        return {
          assignments,
          starredEntities: buildStarredEntities(assignments),
        };
      });
    } catch (error) {
      set({
        assignments: previousAssignments,
        starredEntities: buildStarredEntities(previousAssignments),
      });
      const mapped = withOptimisticError(error, "Failed to remove tag from entity");
      set({ error: mapped.message });
      throw mapped.error;
    }
  },

  toggleStar: async (entityId: string): Promise<void> => {
    const previousAssignments = cloneAssignmentMap(get().assignments);

    const existing = previousAssignments[entityId];
    const optimistic: TagAssignment = {
      entityId,
      entityType: existing?.entityType ?? "file",
      tagIds: [...(existing?.tagIds ?? [])],
      starred: !(existing?.starred ?? false),
      updatedAt: Date.now(),
    };

    const nextAssignments = { ...previousAssignments };
    if (optimistic.tagIds.length === 0 && !optimistic.starred) {
      delete nextAssignments[entityId];
    } else {
      nextAssignments[entityId] = optimistic;
    }

    set({
      assignments: nextAssignments,
      starredEntities: buildStarredEntities(nextAssignments),
      error: null,
    });

    try {
      await tagService.toggleStar(entityId);
      const persisted = await tagService.getAssignment(entityId);

      set((state) => {
        const assignments = { ...state.assignments };
        if (persisted) {
          assignments[entityId] = persisted;
        } else {
          delete assignments[entityId];
        }

        return {
          assignments,
          starredEntities: buildStarredEntities(assignments),
        };
      });
    } catch (error) {
      set({
        assignments: previousAssignments,
        starredEntities: buildStarredEntities(previousAssignments),
      });
      const mapped = withOptimisticError(error, "Failed to toggle star");
      set({ error: mapped.message });
      throw mapped.error;
    }
  },

  setFilterMode: (mode: FilterMode): void => {
    set({ filterMode: mode });
  },

  toggleFilter: (tagId: string): void => {
    const normalizedTagId = tagId.trim();
    if (!normalizedTagId) {
      return;
    }

    set((state) => {
      const activeSet = new Set(state.activeFilters);
      if (activeSet.has(normalizedTagId)) {
        activeSet.delete(normalizedTagId);
      } else {
        activeSet.add(normalizedTagId);
      }

      return {
        activeFilters: Array.from(activeSet),
      };
    });
  },

  clearFilters: (): void => {
    set({ activeFilters: [] });
  },
}));
