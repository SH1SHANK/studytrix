import { create } from "zustand";
import type { EntityType } from "@/features/tags/tag.types";

export type TargetEntity = {
  id: string;
  type: EntityType;
};

interface TagAssignmentState {
  isOpen: boolean;
  targetEntities: TargetEntity[];
}

interface TagAssignmentActions {
  openDrawer: (targets: TargetEntity[]) => void;
  closeDrawer: () => void;
}

export const useTagAssignmentStore = create<TagAssignmentState & TagAssignmentActions>()((set) => ({
  isOpen: false,
  targetEntities: [],

  openDrawer: (targets: TargetEntity[]) => {
    set({ isOpen: true, targetEntities: targets });
  },

  closeDrawer: () => {
    set({ isOpen: false, targetEntities: [] });
  },
}));
