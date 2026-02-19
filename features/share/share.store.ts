import { create } from "zustand";

interface ShareState {
  isOpen: boolean;
  fileName: string | null;
  progress: number;
  totalBytes: number | null;
  loadedBytes: number;
}

interface ShareActions {
  startShare: (fileName: string, totalBytes: number | null) => void;
  updateProgress: (loadedBytes: number) => void;
  endShare: () => void;
  setError: () => void; // Optionally close or keep open with error state, we'll just close it
  closeDrawer: () => void;
}

export const useShareStore = create<ShareState & ShareActions>()((set, get) => ({
  isOpen: false,
  fileName: null,
  progress: 0,
  totalBytes: null,
  loadedBytes: 0,

  startShare: (fileName, totalBytes) => {
    set({
      isOpen: true,
      fileName,
      totalBytes,
      loadedBytes: 0,
      progress: 0,
    });
  },

  updateProgress: (loadedBytes) => {
    const { totalBytes } = get();
    let progress = 0;
    
    if (totalBytes && totalBytes > 0) {
      progress = Math.min(Math.round((loadedBytes / totalBytes) * 100), 100);
    } else {
      // If we don't have totalBytes, just ping-pong or stay at 0
      // the UI can show an indeterminate state
      progress = 0;
    }

    set({ loadedBytes, progress });
  },

  endShare: () => {
    // Optionally wait a second before closing so the user sees 100%
    set({ progress: 100 });
    setTimeout(() => {
      set({ isOpen: false });
    }, 500);
  },

  setError: () => {
    set({ isOpen: false });
  },
  
  closeDrawer: () => {
    set({ isOpen: false });
  },
}));
