import { create } from "zustand";

type ShareProgressUnit = "bytes" | "items";
type ShareStatus = "active" | "error";

interface ShareState {
  isOpen: boolean;
  status: ShareStatus;
  errorMessage: string | null;
  fileName: string | null;
  title: string;
  unit: ShareProgressUnit;
  progress: number;
  total: number | null;
  loaded: number;
}

interface ShareActions {
  startShare: (
    fileName: string,
    total: number | null,
    options?: {
      unit?: ShareProgressUnit;
      title?: string;
    },
  ) => void;
  updateProgress: (loaded: number, total?: number | null) => void;
  endShare: () => void;
  setError: (message?: string) => void;
  closeDrawer: () => void;
}

export const useShareStore = create<ShareState & ShareActions>()((set, get) => ({
  isOpen: false,
  status: "active",
  errorMessage: null,
  fileName: null,
  title: "Preparing to Share",
  unit: "bytes",
  progress: 0,
  total: null,
  loaded: 0,

  startShare: (fileName, total, options) => {
    set({
      isOpen: true,
      status: "active",
      errorMessage: null,
      fileName,
      title: options?.title ?? "Preparing to Share",
      unit: options?.unit ?? "bytes",
      total,
      loaded: 0,
      progress: 0,
    });
  },

  updateProgress: (loaded, totalOverride) => {
    const { total } = get();
    const nextTotal = typeof totalOverride === "number" ? totalOverride : total;
    let progress = 0;
    
    if (nextTotal && nextTotal > 0) {
      progress = Math.min(Math.round((loaded / nextTotal) * 100), 100);
    } else {
      // If we don't have a known total, keep the determinate bar at 0.
      // the UI can show an indeterminate state
      progress = 0;
    }

    set({
      loaded,
      total: nextTotal ?? null,
      progress,
    });
  },

  endShare: () => {
    set({
      status: "active",
      errorMessage: null,
      progress: 100,
    });
    setTimeout(() => {
      set({
        isOpen: false,
        status: "active",
        errorMessage: null,
      });
    }, 500);
  },

  setError: (message) => {
    set({
      isOpen: true,
      status: "error",
      errorMessage: message ?? "Could not prepare this share action.",
    });
  },
  
  closeDrawer: () => {
    set({
      isOpen: false,
      status: "active",
      errorMessage: null,
    });
  },
}));
