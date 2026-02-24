"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { PERSONAL_REPOSITORY_TABS_STORAGE_KEY } from "./custom-folders.constants";
import { useSettingsStore } from "@/features/settings/settings.store";

export type RepositoryPage = "global" | "personal";

type TabsStore = {
  activePage: RepositoryPage;
  setActivePage: (page: RepositoryPage) => void;
};

export const useCustomFoldersTabsStore = create<TabsStore>()(persist(
  (set) => ({
    activePage: "global",
    setActivePage: (page) => {
      const showPersonalRepository = useSettingsStore.getState().values.personal_repository_visible !== false;
      set({ activePage: page === "personal" && !showPersonalRepository ? "global" : page });
    },
  }),
  {
    name: PERSONAL_REPOSITORY_TABS_STORAGE_KEY,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ activePage: state.activePage }),
  },
));
