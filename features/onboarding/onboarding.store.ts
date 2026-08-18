"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface OnboardingStoreState {
  completed: boolean;
  active: boolean;
  isHydrated: boolean;
  markCompleted: () => void;
  setActive: (active: boolean) => void;
  setHydrated: (isHydrated: boolean) => void;
  reset: () => void;
}

const ONBOARDING_STORAGE_KEY = "studytrix_onboarding_v2";

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set) => ({
      completed: false,
      active: false,
      isHydrated: false,
      markCompleted: () => set({ completed: true, active: false }),
      setActive: (active) => set({ active }),
      setHydrated: (isHydrated) => set({ isHydrated }),
      reset: () => set({ completed: false, active: false }),
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ completed: state.completed }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
