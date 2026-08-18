"use client";

import { create } from "zustand";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
import type { DriveWorkspace, WorkspaceSortKey, WorkspaceState } from "./workspace.types";

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeCategory: null,
  sortKey: "recent",
  hydrated: true,

  addWorkspace: (workspaceData) => {
    // Optimistic / async delegation to RxDB repository
    const promise = workspaceRepository.create({
      driveFolderId: workspaceData.driveFolderId.trim(),
      name: workspaceData.name.trim() || "Untitled Workspace",
      description: workspaceData.description?.trim() || null,
      category: workspaceData.category?.trim() || null,
      color: workspaceData.color || "indigo",
      pinned: Boolean(workspaceData.pinned),
      itemCount: workspaceData.itemCount ?? null,
    });

    // Provide immediate optimistic return object
    const now = Date.now();
    const optimistic: DriveWorkspace = {
      id: `ws_${now}`,
      driveFolderId: workspaceData.driveFolderId.trim(),
      name: workspaceData.name.trim() || "Untitled Workspace",
      description: workspaceData.description?.trim(),
      category: workspaceData.category?.trim() || undefined,
      color: workspaceData.color || "indigo",
      pinned: Boolean(workspaceData.pinned),
      itemCount: workspaceData.itemCount,
      createdAt: now,
      updatedAt: now,
    };

    void promise.catch((err) => {
      console.error("[WorkspaceStore] Failed to save workspace to RxDB:", err);
    });

    return optimistic;
  },

  updateWorkspace: (id, updates) => {
    void workspaceRepository.update(id, updates).catch((err) => {
      console.error("[WorkspaceStore] Failed to update workspace in RxDB:", err);
    });
  },

  deleteWorkspace: (id) => {
    void workspaceRepository.delete(id).catch((err) => {
      console.error("[WorkspaceStore] Failed to delete workspace in RxDB:", err);
    });
  },

  togglePinWorkspace: (id) => {
    void workspaceRepository.togglePin(id).catch((err) => {
      console.error("[WorkspaceStore] Failed to toggle pin workspace in RxDB:", err);
    });
  },

  setSortKey: (sortKey: WorkspaceSortKey) => {
    set({ sortKey });
  },

  setActiveCategory: (activeCategory: string | null) => {
    set({ activeCategory });
  },

  importWorkspaces: (imported) => {
    void workspaceRepository
      .bulkUpsert(
        imported.map((w) => ({
          ...w,
          description: w.description || null,
          category: w.category || null,
          color: w.color || null,
          itemCount: w.itemCount || null,
        })),
      )
      .catch((err) => {
        console.error("[WorkspaceStore] Failed to import workspaces to RxDB:", err);
      });
  },

  clearAllWorkspaces: () => {
    set({ activeCategory: null });
  },
}));
