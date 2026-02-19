import { BUILT_IN_COMMANDS, SYSTEM_COMMANDS } from "./command.registry";
import type {
  CommandItem,
  CommandScope,
  SearchEntryType,
} from "./command.types";

export interface SearchEntry {
  id: string;
  name: string;
  type: "file" | "folder" | "tag" | "command" | "course";
  courseCode?: string;
  tags?: string[];
  mime?: string;
  starred?: boolean;
  offline?: boolean;
  size?: number;
  modifiedTime?: string;
  rawString: string;
  parentId?: string;
  createdTime?: string;
  keywords?: string[];
}

export interface FileIndexInput {
  id: string;
  name: string;
  courseCode?: string;
  tags?: string[];
  mime?: string;
  starred?: boolean;
  offline?: boolean;
  size?: number;
  modifiedTime?: string;
  createdTime?: string;
  parentId?: string;
}

export interface FolderIndexInput {
  id: string;
  name: string;
  courseCode?: string;
  tags?: string[];
  starred?: boolean;
  offline?: boolean;
  modifiedTime?: string;
  createdTime?: string;
  parentId?: string;
}

export interface CourseIndexInput {
  id: string;
  name: string;
  code: string;
  tags?: string[];
  starred?: boolean;
  offline?: boolean;
}

export interface TagIndexInput {
  id: string;
  name: string;
}

export interface CommandIndexInput {
  id: string;
  label: string;
  keywords?: string[];
  description?: string;
}

export interface BuildSearchIndexInput {
  files?: FileIndexInput[];
  folders?: FolderIndexInput[];
  courses?: CourseIndexInput[];
  tags?: TagIndexInput[];
  commands?: CommandIndexInput[];
}

export interface CommandIndex {
  items: CommandItem[];
  lastUpdated: number;
  searchEntries: SearchEntry[];
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getExtension(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0 || lastDot >= name.length - 1) {
    return "";
  }

  return normalize(name.slice(lastDot + 1));
}

function composeRawString(parts: Array<string | undefined>): string {
  return unique(parts.map((part) => normalize(part)).filter(Boolean)).join(" ");
}

function createSearchEntry(params: {
  id: string;
  name: string;
  type: SearchEntryType;
  courseCode?: string;
  tags?: string[];
  mime?: string;
  starred?: boolean;
  offline?: boolean;
  size?: number;
  modifiedTime?: string;
  parentId?: string;
  createdTime?: string;
  keywords?: string[];
}): SearchEntry {
  const normalizedName = params.name.trim();
  const normalizedTags = unique(params.tags ?? []).map((tag) => normalize(tag));
  const normalizedKeywords = unique(params.keywords ?? []).map((keyword) => normalize(keyword));

  const extension = getExtension(normalizedName);
  const rawString = composeRawString([
    normalizedName,
    params.type,
    params.courseCode,
    extension,
    params.mime,
    ...normalizedTags,
    ...normalizedKeywords,
  ]);

  return {
    id: params.id,
    name: normalizedName,
    type: params.type,
    courseCode: params.courseCode,
    tags: normalizedTags,
    mime: params.mime,
    starred: params.starred,
    offline: params.offline,
    size: params.size,
    modifiedTime: params.modifiedTime,
    rawString,
    parentId: params.parentId,
    createdTime: params.createdTime,
    keywords: normalizedKeywords,
  };
}

export function buildSearchIndex(input: BuildSearchIndexInput): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const file of input.files ?? []) {
    entries.push(
      createSearchEntry({
        id: file.id,
        name: file.name,
        type: "file",
        courseCode: file.courseCode,
        tags: file.tags,
        mime: file.mime,
        starred: file.starred,
        offline: file.offline,
        size: file.size,
        modifiedTime: file.modifiedTime,
        parentId: file.parentId,
        createdTime: file.createdTime,
      }),
    );
  }

  for (const folder of input.folders ?? []) {
    entries.push(
      createSearchEntry({
        id: folder.id,
        name: folder.name,
        type: "folder",
        courseCode: folder.courseCode,
        tags: folder.tags,
        starred: folder.starred,
        offline: folder.offline,
        modifiedTime: folder.modifiedTime,
        parentId: folder.parentId,
        createdTime: folder.createdTime,
      }),
    );
  }

  for (const course of input.courses ?? []) {
    entries.push(
      createSearchEntry({
        id: course.id,
        name: course.name,
        type: "course",
        courseCode: course.code,
        tags: course.tags,
        starred: course.starred,
        offline: course.offline,
      }),
    );
  }

  for (const tag of input.tags ?? []) {
    entries.push(
      createSearchEntry({
        id: tag.id,
        name: tag.name,
        type: "tag",
      }),
    );
  }

  const commandInputs = input.commands ?? SYSTEM_COMMANDS.map((command) => ({
    id: command.id,
    label: command.label,
    keywords: command.keywords,
    description: command.description,
  }));

  for (const command of commandInputs) {
    entries.push(
      createSearchEntry({
        id: command.id,
        name: command.label,
        type: "command",
        keywords: [command.description ?? "", ...(command.keywords ?? [])],
      }),
    );
  }

  return entries;
}

function toCommandSearchEntries(commands: CommandItem[]): SearchEntry[] {
  return commands.map((command) =>
    createSearchEntry({
      id: command.id,
      name: command.title,
      type: "command",
      keywords: [...(command.keywords ?? []), command.subtitle ?? ""],
      parentId: command.scope === "folder" ? command.entityId : undefined,
    }),
  );
}

export function buildCommandIndex(
  folders: CommandItem[],
  files: CommandItem[],
  contextScope: CommandScope,
): CommandIndex {
  const items: CommandItem[] = [];

  for (const command of BUILT_IN_COMMANDS) {
    if (command.scope === "global" || command.scope === contextScope) {
      items.push(command);
    }
  }

  items.push(...folders, ...files);

  return {
    items,
    lastUpdated: Date.now(),
    searchEntries: toCommandSearchEntries(items),
  };
}
