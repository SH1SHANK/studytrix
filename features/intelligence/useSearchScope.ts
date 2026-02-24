"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useCustomFoldersTabsStore } from "@/features/custom-folders/custom-folders.tabs.store";
import {
  FOLDER_TRAIL_IDS_QUERY_PARAM,
  FOLDER_TRAIL_QUERY_PARAM,
  parseFolderTrailParam,
} from "@/features/navigation/folder-trail";

import type { SearchScope } from "./intelligence.types";

function parseFolderPathFromRoute(pathname: string): { folderId: string | null } {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 3) {
    return { folderId: null };
  }

  return {
    folderId: decodeURIComponent(segments[2] ?? "").trim() || null,
  };
}

function normalizePairList(ids: string[], names: string[]): Array<{ folderId: string; folderName: string }> {
  const pairs: Array<{ folderId: string; folderName: string }> = [];
  const size = Math.min(ids.length, names.length);

  for (let index = 0; index < size; index += 1) {
    const folderId = ids[index]?.trim();
    const folderName = names[index]?.trim();
    if (!folderId || !folderName) {
      continue;
    }

    if (pairs[pairs.length - 1]?.folderId === folderId) {
      continue;
    }

    pairs.push({ folderId, folderName });
  }

  return pairs;
}

export function useSearchScope(): SearchScope {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePage = useCustomFoldersTabsStore((state) => state.activePage);

  return useMemo(() => {
    const { folderId } = parseFolderPathFromRoute(pathname);

    if (!folderId) {
      if (activePage === "personal") {
        return { kind: "personal-root" };
      }
      return { kind: "global-root" };
    }

    const trailIds = parseFolderTrailParam(searchParams.get(FOLDER_TRAIL_IDS_QUERY_PARAM));
    const trailNames = parseFolderTrailParam(searchParams.get(FOLDER_TRAIL_QUERY_PARAM));
    const explicitName = (searchParams.get("name") ?? "").trim();

    const zipped = normalizePairList(trailIds, trailNames);
    const folderIndexFromTrail = zipped.findIndex((entry) => entry.folderId === folderId);
    const trailingLabel = folderIndexFromTrail >= 0
      ? zipped[folderIndexFromTrail]?.folderName
      : zipped[zipped.length - 1]?.folderName;
    const fallbackName = trailingLabel ?? folderId;
    const folderName = explicitName || fallbackName || folderId;
    const breadcrumb = folderIndexFromTrail >= 0
      ? zipped.slice(0, folderIndexFromTrail)
      : zipped;

    return {
      kind: "folder",
      folderId,
      folderName,
      repoKind: activePage === "personal" ? "personal" : "global",
      breadcrumb,
    };
  }, [activePage, pathname, searchParams]);
}
