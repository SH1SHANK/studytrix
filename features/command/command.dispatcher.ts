import { CommandItem } from "./command.types";

export type CommandHandler = (item: CommandItem) => void;

export class CommandDispatcher {
  private registry = new Map<string, CommandHandler>();

  register(id: string, handler: CommandHandler) {
    this.registry.set(id, handler);
  }

  execute(item: CommandItem) {
    const handler = this.registry.get(item.id);
    if (handler) handler(item);
  }
}
