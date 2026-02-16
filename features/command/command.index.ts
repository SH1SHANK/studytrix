import { BUILT_IN_COMMANDS } from "./command.registry";
import { CommandItem } from "./command.types";

export interface CommandIndex {
  items: CommandItem[];
  lastUpdated: number;
}

export function buildCommandIndex(
  folders: CommandItem[],
  files: CommandItem[],
  contextScope: "global" | "folder"
): CommandIndex {
  // Normalize inputs
  const items: CommandItem[] = [];

  // Inject built-in commands
  for (const cmd of BUILT_IN_COMMANDS) {
    if (cmd.scope === "global" || cmd.scope === contextScope) {
      items.push(cmd);
    }
  }

  // Inject folder and file items
  items.push(...folders, ...files);

  return {
    items,
    lastUpdated: Date.now(),
  };
}
