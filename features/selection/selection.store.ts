import { create } from "zustand";

import type { DriveItem } from "@/features/drive/drive.types";

interface SelectionState {
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  contextItems: DriveItem[];
}

interface SelectionActions {
  setSelectionMode: (active: boolean) => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setContextItems: (items: DriveItem[]) => void;
}

export const useSelectionStore = create<SelectionState & SelectionActions>()((set) => ({
  isSelectionMode: false,
  selectedIds: new Set<string>(),
  contextItems: [],

  setSelectionMode: (active: boolean) => {
    set((state) => {
      // If turning off selection mode, also clear all selected items
      if (!active) {
        return { isSelectionMode: false, selectedIds: new Set(), contextItems: [] };
      }
      return { isSelectionMode: true };
    });
  },

  toggleSelection: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      
      // If we unselected the last item, maybe we drop out of selection mode
      // Let's keep selection mode active even if 0 are selected, until they manually cancel.
      // But we always ensure selection mode is TRUE if we are adding an item.
      return { 
        selectedIds: next,
        isSelectionMode: next.size > 0 ? true : state.isSelectionMode
      };
    });
  },

  selectAll: (ids: string[]) => {
    set({
      selectedIds: new Set(ids),
      isSelectionMode: true,
    });
  },

  clearSelection: () => {
    set({
      selectedIds: new Set(),
      isSelectionMode: false,
      contextItems: [],
    });
  },

  setContextItems: (items: DriveItem[]) => {
    set({ contextItems: items });
  },
}));

