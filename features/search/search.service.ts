import { workspaceRepository } from "@/db/repositories/workspace.repository";
import { driveFileRepository } from "@/db/repositories/drive-file.repository";
import { tagRepository } from "@/db/repositories/tag.repository";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import type { DriveFileDocType } from "@/db/types";

export type SearchResultType = "workspace" | "folder" | "file" | "tag" | "source";

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  url: string;
  workspaceId?: string;
  iconType?: string;
  meta?: Record<string, unknown>;
}

export interface SearchOptions {
  limit?: number;
  types?: SearchResultType[];
}

export class SearchService {
  async search(query: string, options?: SearchOptions): Promise<SearchResultItem[]> {
    const rawQuery = query.trim().toLowerCase();
    const limit = options?.limit ?? 20;
    const types = new Set<SearchResultType>(
      options?.types ?? ["workspace", "folder", "file", "tag", "source"],
    );

    if (!rawQuery) {
      return this.getEmptyStateSuggestions(limit);
    }

    const results: SearchResultItem[] = [];

    // 1. Search Workspaces
    if (types.has("workspace")) {
      const workspaces = await workspaceRepository.getAll();
      for (const ws of workspaces) {
        if (
          ws.name.toLowerCase().includes(rawQuery) ||
          ws.description?.toLowerCase().includes(rawQuery)
        ) {
          results.push({
            id: `ws-${ws.id}`,
            type: "workspace",
            title: ws.name,
            subtitle: "Workspace",
            url: `/workspace/${ws.id}`,
            workspaceId: ws.id,
          });
        }
      }
    }

    // 2. Search Folders
    if (types.has("folder")) {
      const db = await (await import("@/db/database")).getDatabase();
      const folders = await db.folders.find().exec();
      for (const f of folders) {
        if (f.name.toLowerCase().includes(rawQuery)) {
          results.push({
            id: `folder-${f.id}`,
            type: "folder",
            title: f.name,
            subtitle: "Local Folder",
            url: `/workspace/${f.workspaceId}/folder/${f.id}`,
            workspaceId: f.workspaceId,
          });
        }
      }
    }

    // 3. Search Drive Sources
    if (types.has("source")) {
      const sources = await driveSourceRepository.getAll();
      for (const s of sources) {
        if (s.name.toLowerCase().includes(rawQuery) || s.url.toLowerCase().includes(rawQuery)) {
          results.push({
            id: `source-${s.id}`,
            type: "source",
            title: s.name,
            subtitle: `Drive Source · ${s.fileCount} files`,
            url: `/sources`,
          });
        }
      }
    }

    // 4. Search Tags
    if (types.has("tag")) {
      const tags = await tagRepository.getAllTags();
      for (const t of tags) {
        if (t.name.toLowerCase().includes(rawQuery)) {
          results.push({
            id: `tag-${t.id}`,
            type: "tag",
            title: `#${t.name}`,
            subtitle: `Tag · ${t.uses} items`,
            url: `/tags/${t.id}`,
          });
        }
      }
    }

    // 5. Search Files
    if (types.has("file")) {
      const db = await (await import("@/db/database")).getDatabase();
      const matchedFiles = await db.drive_files
        .find({
          selector: {
            remoteStatus: { $ne: "deleted" },
          },
          limit: 150,
        })
        .exec();

      for (const doc of matchedFiles) {
        const file = doc.toJSON() as DriveFileDocType;
        if (
          file.name.toLowerCase().includes(rawQuery) ||
          file.path.toLowerCase().includes(rawQuery)
        ) {
          results.push({
            id: `file-${file.id}`,
            type: "file",
            title: file.name,
            subtitle: file.path || "Drive File",
            url: file.workspaceId
              ? `/workspace/${file.workspaceId}`
              : `/files`,
            meta: { fileId: file.id, mimeType: file.mimeType },
          });
        }
      }
    }

    return results.slice(0, limit);
  }

  private async getEmptyStateSuggestions(limit: number): Promise<SearchResultItem[]> {
    const results: SearchResultItem[] = [];

    // Return recent workspaces
    const workspaces = await workspaceRepository.getAll();
    for (const ws of workspaces.slice(0, 4)) {
      results.push({
        id: `ws-${ws.id}`,
        type: "workspace",
        title: ws.name,
        subtitle: "Workspace",
        url: `/workspace/${ws.id}`,
        workspaceId: ws.id,
      });
    }

    // Return recent files if any
    const recentFiles = await driveFileRepository.getRecentFiles(6);
    for (const file of recentFiles) {
      results.push({
        id: `file-${file.id}`,
        type: "file",
        title: file.name,
        subtitle: "Recently opened",
        url: file.workspaceId ? `/workspace/${file.workspaceId}` : `/files`,
        meta: { fileId: file.id },
      });
    }

    return results.slice(0, limit);
  }
}

export const searchService = new SearchService();
