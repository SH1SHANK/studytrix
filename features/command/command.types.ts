/**
 * Scope indicating where a command is valid.
 */
export type CommandScope = "global" | "folder";

/**
 * Logical grouping used to organize command results.
 */
export type CommandGroup =
  | "navigation"
  | "folders"
  | "files"
  | "actions"
  | "system";

/**
 * Canonical command item used by indexing, ranking, and dispatching.
 */
export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  keywords?: string[];
  group: CommandGroup;
  scope: CommandScope;
  entityId?: string;
  score?: number;
  payload?: Record<string, unknown>;
}
