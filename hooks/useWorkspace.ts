"use client";

import { useEffect, useState } from "react";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
import type { WorkspaceDocType } from "@/db/types";

interface UseWorkspaceResult {
  workspace: WorkspaceDocType | null;
  loading: boolean;
  error: Error | null;
}

export function useWorkspace(workspaceId: string | null | undefined): UseWorkspaceResult {
  const [workspace, setWorkspace] = useState<WorkspaceDocType | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(workspaceId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setWorkspace(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Immediate direct query
    workspaceRepository
      .getById(workspaceId)
      .then((doc) => {
        if (isMounted) {
          setWorkspace(doc);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to load workspace"));
          setLoading(false);
        }
      });

    // Reactive RxDB subscription
    const sub = workspaceRepository.observeById(workspaceId).subscribe({
      next: (doc) => {
        if (isMounted) {
          setWorkspace(doc);
          setLoading(false);
        }
      },
      error: (err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to observe workspace"));
          setLoading(false);
        }
      },
    });

    return () => {
      isMounted = false;
      sub.unsubscribe();
    };
  }, [workspaceId]);

  return { workspace, loading, error };
}
