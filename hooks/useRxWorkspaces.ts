"use client";

import { useEffect, useState } from "react";
import { runLegacyMigration } from "@/db/migrations/legacy";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
import type { WorkspaceDocType } from "@/db/types";

export function useRxWorkspaces(): {
  workspaces: WorkspaceDocType[];
  loading: boolean;
  error: Error | null;
} {
  const [workspaces, setWorkspaces] = useState<WorkspaceDocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Run legacy migration once on client startup
    void runLegacyMigration().catch((err) => {
      console.warn("[RxDB] Legacy migration check failed:", err);
    });

    const subscription = workspaceRepository.observeAll().subscribe({
      next: (data) => {
        if (isMounted) {
          setWorkspaces(data);
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

  return { workspaces, loading, error };
}
