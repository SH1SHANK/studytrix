export type FieldFilterKey =
  | "tag"
  | "type"
  | "course"
  | "ext"
  | "mime";

export type BooleanFlagKey = "starred" | "offline";

export type ComparisonKey = "size" | "modified" | "created";

export interface ComparisonFilter {
  field: ComparisonKey;
  operator: ">" | "<" | ">=" | "<=" | "=";
  value: number;
}

export interface FieldFilter {
  field: FieldFilterKey;
  values: string[];
}

export interface BooleanFilter {
  field: BooleanFlagKey;
  value: boolean;
}

export interface QueryAST {
  keywords: string[];
  fieldFilters: FieldFilter[];
  comparisons: ComparisonFilter[];
  booleanFilters: BooleanFilter[];
  orGroups?: QueryAST[];
}

export type QueryTokenType = "WORD" | "COLON" | "OPERATOR" | "OR";

export interface QueryToken {
  type: QueryTokenType;
  value: string;
  start: number;
  end: number;
}

export interface ParseResult {
  ast: QueryAST;
  errors: string[];
}

export type SearchEntryType = "file" | "folder" | "tag" | "command" | "course";

export type CommandScope = "global" | "folder" | "file";

export type CommandGroup =
  | "navigation"
  | "folders"
  | "files"
  | "actions"
  | "system";

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
