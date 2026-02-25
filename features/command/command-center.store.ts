"use client";

import { create } from "zustand";

type CommandCenterStore = {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
};

export const useCommandCenterStore = create<CommandCenterStore>((set) => ({
  isOpen: false,
  setOpen: (isOpen) => {
    set({ isOpen });
  },
}));

