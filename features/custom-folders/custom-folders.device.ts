"use client";

export const deviceFolderSupported: boolean =
  typeof window !== "undefined"
  && (
    window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
  && "showDirectoryPicker" in window;
