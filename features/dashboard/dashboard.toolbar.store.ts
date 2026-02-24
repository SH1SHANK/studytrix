"use client";

import { create } from "zustand";

export type DashboardToolbarViewMode = "grid" | "list";
export type DashboardToolbarSortKey = "recent" | "name" | "metric";
export type PersonalRepositoryFilterMode = "all" | "pinned" | "unpinned" | "starred" | "unstarred";

type DashboardToolbarStore = {
  viewMode: DashboardToolbarViewMode;
  sortKey: DashboardToolbarSortKey;
  personalFilterMode: PersonalRepositoryFilterMode;
  setViewMode: (mode: DashboardToolbarViewMode) => void;
  setSortKey: (key: DashboardToolbarSortKey) => void;
  setPersonalFilterMode: (mode: PersonalRepositoryFilterMode) => void;
};

export const useDashboardToolbarStore = create<DashboardToolbarStore>((set) => ({
  viewMode: "grid",
  sortKey: "recent",
  personalFilterMode: "all",
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortKey: (key) => set({ sortKey: key }),
  setPersonalFilterMode: (mode) => set({ personalFilterMode: mode }),
}));
