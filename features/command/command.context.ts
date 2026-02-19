import type { CommandScope } from "./command.types";

export interface CommandContext {
  scope?: "global" | "folder" | "file";
  currentFolderId?: string;
  currentFileId?: string;
  activeTags?: string[];
  departmentId?: string;
  semesterId?: string;
  folderId?: string;
  pinnedIds: string[];
  recentIds: string[];
  recentFilters?: string[];
}

export interface CommandContextMethods {
  setScope(scope: CommandScope): void;
  setFolder(folderId?: string): void;
  setFile(fileId?: string): void;
  setActiveTags(tags: string[]): void;
}

function uniqueValues(values: readonly string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function normalizeContext(
  context: Partial<CommandContext> | undefined,
): CommandContext {
  const scope = context?.scope ?? "global";
  const currentFolderId = context?.currentFolderId ?? context?.folderId;

  return {
    scope,
    currentFolderId,
    currentFileId: context?.currentFileId,
    activeTags: uniqueValues(context?.activeTags),
    departmentId: context?.departmentId,
    semesterId: context?.semesterId,
    folderId: currentFolderId,
    pinnedIds: uniqueValues(context?.pinnedIds),
    recentIds: uniqueValues(context?.recentIds),
    recentFilters: uniqueValues(context?.recentFilters),
  };
}

export class CommandContextState implements CommandContextMethods {
  private state: CommandContext;

  constructor(initial?: Partial<CommandContext>) {
    this.state = normalizeContext(initial);
  }

  get value(): CommandContext {
    return { ...this.state };
  }

  setScope(scope: CommandScope): void {
    this.state = {
      ...this.state,
      scope,
    };
  }

  setFolder(folderId?: string): void {
    const normalizedFolderId = folderId?.trim();

    this.state = {
      ...this.state,
      currentFolderId: normalizedFolderId,
      folderId: normalizedFolderId,
      currentFileId: normalizedFolderId ? this.state.currentFileId : undefined,
      scope: normalizedFolderId ? "folder" : "global",
    };
  }

  setFile(fileId?: string): void {
    const normalizedFileId = fileId?.trim();

    this.state = {
      ...this.state,
      currentFileId: normalizedFileId,
      scope: normalizedFileId ? "file" : this.state.currentFolderId ? "folder" : "global",
    };
  }

  setActiveTags(tags: string[]): void {
    this.state = {
      ...this.state,
      activeTags: uniqueValues(tags),
    };
  }
}
