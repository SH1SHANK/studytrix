import { CommandContext } from "./command.context";
import { CommandIndex } from "./command.index";
import { rankCommands } from "./command.ranking";
import { CommandItem } from "./command.types";

export class CommandService {
  private index: CommandIndex;

  constructor(index: CommandIndex) {
    this.index = index;
  }

  search(query: string, context: CommandContext): CommandItem[] {
    // Filter by folder scope first
    const items = this.index.items.filter(
      (item) =>
        item.scope === "global" ||
        (item.scope === "folder" && !!context.folderId)
    );

    const ranked = rankCommands(items, query, [
      ...context.pinnedIds,
      ...context.recentIds,
    ]);

    return ranked;
  }
}
