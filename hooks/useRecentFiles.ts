"use client";

import { useEffect, useState } from "react";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";
import type { DriveFileDocType } from "@/db/types";

export function useRecentFiles(limit = 12) {
  const [recentFiles, setRecentFiles] = useState<DriveFileDocType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Load initial
    driveFileRepository.getRecentFiles(limit).then((files) => {
      if (isMounted) {
        setRecentFiles(files);
        setLoading(false);
      }
    });

    // Subscribe to updates
    const subscription = driveFileRepository.observeRecentFiles(limit).subscribe({
      next: (files) => {
        if (isMounted) {
          setRecentFiles(files);
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("[useRecentFiles] Observable error:", err);
      },
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [limit]);

  return { recentFiles, loading };
}
