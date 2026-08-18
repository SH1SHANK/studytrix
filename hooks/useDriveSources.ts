"use client";

import { useEffect, useState } from "react";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import type { DriveSourceDocType } from "@/db/types";

export function useDriveSources(): {
  sources: DriveSourceDocType[];
  loading: boolean;
  error: Error | null;
} {
  const [sources, setSources] = useState<DriveSourceDocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const subscription = driveSourceRepository.observeSources().subscribe({
      next: (data) => {
        if (isMounted) {
          setSources(data);
          setLoading(false);
        }
      },
      error: (err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      },
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { sources, loading, error };
}
