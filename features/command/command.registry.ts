import type { CommandContext } from "./command.context";
import type { CommandGroup, CommandItem, CommandScope } from "./command.types";

export interface StructuredCommand {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  execute(context: CommandContext, payload?: unknown): void;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function readPayloadValue(payload: unknown, key: string): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  return normalizeString(record[key]);
}

function setScope(context: CommandContext, scope: CommandScope): void {
  context.scope = scope;
}

function setFolder(context: CommandContext, folderId?: string): void {
  const normalizedFolderId = normalizeString(folderId);
  context.currentFolderId = normalizedFolderId;
  context.folderId = normalizedFolderId;
  context.currentFileId = normalizedFolderId ? context.currentFileId : undefined;
  context.scope = normalizedFolderId ? "folder" : "global";
}

function setFile(context: CommandContext, fileId?: string): void {
  const normalizedFileId = normalizeString(fileId);
  context.currentFileId = normalizedFileId;
  context.scope = normalizedFileId ? "file" : context.currentFolderId ? "folder" : "global";
}

function addActiveTag(context: CommandContext, tag: string): void {
  const normalized = normalizeString(tag);
  if (!normalized) {
    return;
  }

  const next = new Set(context.activeTags ?? []);
  next.add(normalized.toLocaleLowerCase());
  context.activeTags = Array.from(next);
}

function removeActiveTag(context: CommandContext, tag: string): void {
  const normalized = normalizeString(tag)?.toLocaleLowerCase();
  if (!normalized) {
    return;
  }

  const next = new Set(context.activeTags ?? []);
  next.delete(normalized);
  context.activeTags = Array.from(next);
}

function mapCommandToLegacyItem(command: StructuredCommand): CommandItem {
  let group: CommandGroup = "system";

  if (command.id.startsWith("navigate:")) {
    group = "navigation";
  } else if (command.id.startsWith("tag:")) {
    group = "actions";
  } else if (command.id.startsWith("toggle:")) {
    group = "actions";
  }

  const scope: CommandScope = command.id.startsWith("navigate:") ? "folder" : "global";

  return {
    id: command.id,
    title: command.label,
    subtitle: command.description,
    keywords: command.keywords,
    group,
    scope,
  };
}

export const SYSTEM_COMMANDS: StructuredCommand[] = [
  {
    id: "navigate:folder",
    label: "Navigate Folder",
    description: "Move command scope to a folder",
    keywords: ["navigate", "folder", "open"],
    execute(context, payload) {
      const folderId = readPayloadValue(payload, "folderId") ?? readPayloadValue(payload, "id");
      if (folderId) {
        setFolder(context, folderId);
      } else {
        setScope(context, "folder");
      }
    },
  },
  {
    id: "toggle:star",
    label: "Toggle Star",
    description: "Toggle starred state for current entity",
    keywords: ["star", "favorite", "pin"],
    execute(context) {
      addActiveTag(context, "starred");
    },
  },
  {
    id: "toggle:offline",
    label: "Toggle Offline",
    description: "Toggle offline state for current entity",
    keywords: ["offline", "download", "cache"],
    execute(context) {
      addActiveTag(context, "offline");
    },
  },
  {
    id: "tag:add",
    label: "Add Tag",
    description: "Add tag filter to current context",
    keywords: ["tag", "add", "filter"],
    execute(context, payload) {
      const tag = readPayloadValue(payload, "tag") ?? readPayloadValue(payload, "value");
      if (tag) {
        addActiveTag(context, tag);
      }
    },
  },
  {
    id: "tag:remove",
    label: "Remove Tag",
    description: "Remove tag filter from current context",
    keywords: ["tag", "remove", "filter"],
    execute(context, payload) {
      const tag = readPayloadValue(payload, "tag") ?? readPayloadValue(payload, "value");
      if (tag) {
        removeActiveTag(context, tag);
      }
    },
  },
  {
    id: "view:toggle",
    label: "Toggle View",
    description: "Toggle current browsing scope",
    keywords: ["view", "toggle", "layout"],
    execute(context) {
      if (context.scope === "global") {
        setScope(context, context.currentFolderId ? "folder" : "global");
        return;
      }

      if (context.scope === "folder") {
        setScope(context, context.currentFileId ? "file" : "global");
        return;
      }

      setScope(context, context.currentFolderId ? "folder" : "global");
    },
  },
  {
    id: "search:reset",
    label: "Reset Search",
    description: "Clear active tags and recent filters",
    keywords: ["search", "reset", "clear"],
    execute(context) {
      context.activeTags = [];
      context.recentFilters = [];
      if (context.currentFileId) {
        setFile(context, undefined);
      }
    },
  },
  {
    id: "go-back",
    label: "Go Back",
    description: "Go to previous route",
    keywords: ["back", "navigation"],
    execute() {
      return;
    },
  },
  {
    id: "open-settings",
    label: "Open Settings",
    description: "Open app settings",
    keywords: ["settings", "preferences"],
    execute() {
      return;
    },
  },
  {
    id: "open-storage",
    label: "Open Storage Dashboard",
    description: "Open offline storage analytics and cleanup tools",
    keywords: ["storage", "offline", "dashboard", "quota"],
    execute() {
      return;
    },
  },
  {
    id: "toggle-view",
    label: "Toggle View Mode",
    description: "Toggle between available view modes",
    keywords: ["toggle", "view"],
    execute() {
      return;
    },
  },
  {
    id: "mark-offline",
    label: "Mark Item Offline",
    description: "Mark selected item as offline",
    keywords: ["offline", "download"],
    execute() {
      return;
    },
  },
];

export function createCommandRegistry(commands: StructuredCommand[] = SYSTEM_COMMANDS): Map<string, StructuredCommand> {
  const registry = new Map<string, StructuredCommand>();

  for (const command of commands) {
    registry.set(command.id, command);
  }

  return registry;
}

export const BUILT_IN_COMMANDS: CommandItem[] = SYSTEM_COMMANDS.map(mapCommandToLegacyItem);
