export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  uses: number;
  updatedAt: number;
  isSystem: boolean;
}

export type EntityType = "file" | "folder";

export interface TagAssignment {
  entityId: string;
  entityType: EntityType;
  tagIds: string[];
  starred: boolean;
  updatedAt: number;
}

export type FilterMode = "AND" | "OR";

export interface TagFilterState {
  activeTagIds: string[];
  mode: FilterMode;
}

export interface TagSearchResult {
  tag: Tag;
  score: number;
}

export interface TagUsageAnalytics {
  tagId: string;
  uses: number;
  lastUsedAt: number;
}

export interface TagChipViewModel {
  id: string;
  label: string;
  color: string;
  uses: number;
  isActive: boolean;
  showRemoveControl: boolean;
}

export interface TagChipOverflow {
  visible: TagChipViewModel[];
  overflowCount: number;
}

export interface EntityTagIndexRecord {
  entityId: string;
  entityType: EntityType;
  tagIds: readonly string[];
  starred: boolean;
  relevance?: number;
  name?: string;
  modifiedTime?: string | null;
  size?: number | null;
}

export interface TagCommandActionPayload {
  action: "tag-filter" | "remove-tag-filter" | "star" | "unstar";
  tagId?: string;
  entityId?: string;
}
