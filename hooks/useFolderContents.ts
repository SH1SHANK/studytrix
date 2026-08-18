"use client";

import { useEffect, useState } from "react";
import { folderRepository } from "@/db/repositories/folder.repository";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";
import type { FolderDocType, DriveFileDocType } from "@/db/types";

export function useFolderContents(workspaceId: string, parentFolderId: string | null = null) {
  const [folders, setFolders] = useState<FolderDocType[]>([]);
  const [files, setFiles] = useState<DriveFileDocType[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setFolders([]);
      setFiles([]);
      setBreadcrumbs([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Load initial breadcrumbs if inside a folder
    if (parentFolderId) {
      folderRepository.getFolderPath(parentFolderId).then((path) => {
        if (isMounted) setBreadcrumbs(path);
      });
    } else {
      setBreadcrumbs([]);
    }

    // Subscribe to child folders
    const folderSub = folderRepository
      .observeFoldersInFolder(workspaceId, parentFolderId)
      .subscribe({
        next: (items) => {
          if (isMounted) {
            setFolders(items);
            setLoading(false);
          }
        },
        error: (err) => console.error("[useFolderContents] Folder error:", err),
      });

    // Subscribe to files in local folder
    driveFileRepository.getFilesInLocalFolder(workspaceId, parentFolderId).then((items) => {
      if (isMounted) {
        setFiles(items);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      folderSub.unsubscribe();
    };
  }, [parentFolderId, workspaceId]);

  return { folders, files, breadcrumbs, loading };
}
