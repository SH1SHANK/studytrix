"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type DriveItem, isDriveFolder } from "./drive.types";

type DriveState = {
  items: DriveItem[];
  folders: DriveItem[];
  files: DriveItem[];
  isLoading: boolean;
  error: string | null;
};

function isUnavailableFolderId(folderId: string): boolean {
  return folderId.trim().toUpperCase().startsWith("UNAVAILABLE_");
}

export function useDriveFolder(folderId: string | null): DriveState {
  const [state, setState] = useState<DriveState>({
    items: [],
    folders: [],
    files: [],
    isLoading: !!folderId,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchFolder = useCallback(async () => {
    if (!folderId) {
      setState({
        items: [],
        folders: [],
        files: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    if (isUnavailableFolderId(folderId)) {
      setState({
        items: [],
        folders: [],
        files: [],
        isLoading: false,
        error: "This course folder is not available yet.",
      });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `/api/drive/${encodeURIComponent(folderId)}`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ??
            `Request failed (${response.status})`,
        );
      }

      const data = (await response.json()) as { items: DriveItem[] };
      const items = data.items ?? [];

      if (!controller.signal.aborted) {
        setState({
          items,
          folders: items.filter(isDriveFolder),
          files: items.filter((item) => !isDriveFolder(item)),
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      if (!controller.signal.aborted) {
        setState({
          items: [],
          folders: [],
          files: [],
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load folder",
        });
      }
    }
  }, [folderId]);

  useEffect(() => {
    fetchFolder();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchFolder]);

  return state;
}
