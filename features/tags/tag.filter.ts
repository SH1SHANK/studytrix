import type {
  EntityTagIndexRecord,
  FilterMode,
  Tag,
  TagChipOverflow,
  TagChipViewModel,
} from "./tag.types";

export type EntitySortField = "name" | "date" | "size" | "relevance";
export type SortDirection = "asc" | "desc";

export interface SortEntitiesOptions {
  activeTagIds?: readonly string[];
  filterMode?: FilterMode;
  sortBy?: EntitySortField;
  direction?: SortDirection;
}

function uniqueTagIds(tagIds: readonly string[]): string[] {
  return Array.from(new Set(tagIds.map((tagId) => tagId.trim()).filter(Boolean)));
}

function hasAllTags(entityTags: readonly string[], selected: readonly string[]): boolean {
  if (selected.length === 0) {
    return true;
  }

  const tagSet = new Set(entityTags);
  return selected.every((tagId) => tagSet.has(tagId));
}

function hasAnyTag(entityTags: readonly string[], selected: readonly string[]): boolean {
  if (selected.length === 0) {
    return true;
  }

  const tagSet = new Set(entityTags);
  return selected.some((tagId) => tagSet.has(tagId));
}

function isEntityMatch(
  entity: EntityTagIndexRecord,
  activeTagIds: readonly string[],
  mode: FilterMode,
): boolean {
  const entityTags = uniqueTagIds(entity.tagIds);

  if (mode === "AND") {
    return hasAllTags(entityTags, activeTagIds);
  }

  return hasAnyTag(entityTags, activeTagIds);
}

function compareByName(
  left: EntityTagIndexRecord,
  right: EntityTagIndexRecord,
  direction: SortDirection,
): number {
  const leftName = (left.name ?? "").toLocaleLowerCase();
  const rightName = (right.name ?? "").toLocaleLowerCase();

  if (leftName === rightName) {
    return 0;
  }

  return direction === "asc"
    ? leftName.localeCompare(rightName)
    : rightName.localeCompare(leftName);
}

function compareByDate(
  left: EntityTagIndexRecord,
  right: EntityTagIndexRecord,
  direction: SortDirection,
): number {
  const leftTime = left.modifiedTime ? Date.parse(left.modifiedTime) : 0;
  const rightTime = right.modifiedTime ? Date.parse(right.modifiedTime) : 0;

  if (leftTime === rightTime) {
    return 0;
  }

  return direction === "asc" ? leftTime - rightTime : rightTime - leftTime;
}

function compareBySize(
  left: EntityTagIndexRecord,
  right: EntityTagIndexRecord,
  direction: SortDirection,
): number {
  const leftSize = left.size ?? 0;
  const rightSize = right.size ?? 0;

  if (leftSize === rightSize) {
    return 0;
  }

  return direction === "asc" ? leftSize - rightSize : rightSize - leftSize;
}

function compareByRelevance(
  left: EntityTagIndexRecord,
  right: EntityTagIndexRecord,
  direction: SortDirection,
): number {
  const leftScore = left.relevance ?? 0;
  const rightScore = right.relevance ?? 0;

  if (leftScore === rightScore) {
    return 0;
  }

  return direction === "asc" ? leftScore - rightScore : rightScore - leftScore;
}

export function filterEntities(
  allEntities: EntityTagIndexRecord[],
  activeTagIds: string[],
  mode: FilterMode,
): EntityTagIndexRecord[] {
  const normalizedTagIds = uniqueTagIds(activeTagIds);

  if (normalizedTagIds.length === 0) {
    return [...allEntities];
  }

  return allEntities.filter((entity) => isEntityMatch(entity, normalizedTagIds, mode));
}

export function getFilteredResultCount(
  allEntities: EntityTagIndexRecord[],
  activeTagIds: string[],
  mode: FilterMode,
): number {
  return filterEntities(allEntities, activeTagIds, mode).length;
}

export function sortEntitiesWithRules(
  entities: EntityTagIndexRecord[],
  options: SortEntitiesOptions = {},
): EntityTagIndexRecord[] {
  const {
    activeTagIds = [],
    filterMode = "OR",
    sortBy = "name",
    direction = "asc",
  } = options;

  const normalizedTagIds = uniqueTagIds(activeTagIds);

  return [...entities].sort((left, right) => {
    if (left.starred !== right.starred) {
      return left.starred ? -1 : 1;
    }

    if (normalizedTagIds.length > 0) {
      const leftMatch = isEntityMatch(left, normalizedTagIds, filterMode);
      const rightMatch = isEntityMatch(right, normalizedTagIds, filterMode);

      if (leftMatch !== rightMatch) {
        return leftMatch ? -1 : 1;
      }
    }

    const sortDelta =
      sortBy === "date"
        ? compareByDate(left, right, direction)
        : sortBy === "size"
          ? compareBySize(left, right, direction)
          : sortBy === "relevance"
            ? compareByRelevance(left, right, direction)
            : compareByName(left, right, direction);

    if (sortDelta !== 0) {
      return sortDelta;
    }

    return compareByName(left, right, "asc");
  });
}

function normalizeHex(hex: string): string {
  return hex.trim().toUpperCase();
}

function parseHexColor(hex: string): [number, number, number] | null {
  const normalized = normalizeHex(hex);
  if (!/^#[0-9A-F]{6}$/.test(normalized)) {
    return null;
  }

  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);

  return [r, g, b];
}

function getRelativeLuminance(color: [number, number, number]): number {
  const [r, g, b] = color.map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getTagChipTextColor(backgroundHex: string): string {
  const rgb = parseHexColor(backgroundHex);
  if (!rgb) {
    return "hsl(var(--foreground))";
  }

  const luminance = getRelativeLuminance(rgb);
  return luminance > 0.5 ? "#0F172A" : "#FFFFFF";
}

export function getTagChipStyle(color: string): {
  backgroundColor: string;
  borderColor: string;
  color: string;
} {
  const normalized = color.trim();
  if (!normalized) {
    return {
      backgroundColor: "var(--muted)",
      borderColor: "var(--border)",
      color: "var(--foreground)",
    };
  }

  return {
    backgroundColor: `color-mix(in oklab, ${normalized} 18%, var(--card))`,
    borderColor: `color-mix(in oklab, ${normalized} 44%, var(--border))`,
    color: `color-mix(in oklab, ${normalized} 78%, var(--foreground))`,
  };
}

export function buildTagChipModels(
  tags: readonly Tag[],
  activeTagIds: readonly string[],
): TagChipViewModel[] {
  const activeSet = new Set(activeTagIds);

  return tags.map((tag) => ({
    id: tag.id,
    label: tag.name,
    color: tag.color,
    uses: tag.uses,
    isActive: activeSet.has(tag.id),
    showRemoveControl: activeSet.has(tag.id),
  }));
}

export function collapseTagChips(
  chips: readonly TagChipViewModel[],
  maxVisible: number,
): TagChipOverflow {
  if (maxVisible <= 0) {
    return {
      visible: [],
      overflowCount: chips.length,
    };
  }

  if (chips.length <= maxVisible) {
    return {
      visible: [...chips],
      overflowCount: 0,
    };
  }

  return {
    visible: chips.slice(0, maxVisible),
    overflowCount: chips.length - maxVisible,
  };
}
