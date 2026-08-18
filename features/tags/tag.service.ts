import { tagRepository } from "@/db/repositories/tag.repository";
import { markTagTouched, markTagUsed, sortTagsByAnalytics } from "./tag.analytics";
import type { EntityType, FilterMode, Tag, TagAssignment } from "./tag.types";

const TAG_COLOR_PATTERN = /^#([0-9A-Fa-f]{6})$/;
const ENTITY_ID_PATTERN = /^[A-Za-z0-9._:-]{1,256}$/;
const TAG_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const ASSIGNMENT_DEBOUNCE_MS = 120;

const RESERVED_SYSTEM_TAG_NAMES = new Set([
  "all",
  "untagged",
  "starred",
  "favorites",
  "recent",
  "system",
]);

type ServiceErrorCode = "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "PERSISTENCE";

interface PendingAssignmentWrite {
  entityId: string;
  operations: AssignmentOperation[];
  listeners: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }>;
  timer: ReturnType<typeof setTimeout>;
}

type AssignmentOperation = (
  current: TagAssignment | null,
) => TagAssignment | null;

export class TagServiceError extends Error {
  readonly code: ServiceErrorCode;

  constructor(code: ServiceErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TagServiceError";
    this.code = code;
  }
}

function makeTagId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `tag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeId(value: string): string {
  return value.trim();
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeColor(value: string): string {
  return value.trim().toUpperCase();
}

function toTagKey(value: string): string {
  return normalizeName(value).toLowerCase();
}

function assertValidEntityId(entityId: string): void {
  if (!entityId || !ENTITY_ID_PATTERN.test(entityId)) {
    throw new TagServiceError("VALIDATION", "Invalid entity identifier format");
  }
}

function assertValidTagId(tagId: string): void {
  if (!tagId || !TAG_ID_PATTERN.test(tagId)) {
    throw new TagServiceError("VALIDATION", "Invalid tag identifier format");
  }
}

function assertValidTagName(name: string): void {
  if (!name || name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    throw new TagServiceError(
      "VALIDATION",
      `Tag name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
    );
  }

  if (RESERVED_SYSTEM_TAG_NAMES.has(name.toLowerCase())) {
    throw new TagServiceError("VALIDATION", `Tag name "${name}" is reserved by system`);
  }
}

function assertValidTagColor(color: string): void {
  if (!TAG_COLOR_PATTERN.test(color)) {
    throw new TagServiceError("VALIDATION", "Tag color must be a valid 6-digit hex string (#RRGGBB)");
  }
}

function uniqueTagIds(tagIds: string[]): string[] {
  const set = new Set<string>();
  for (const tagId of tagIds) {
    const normalized = normalizeId(tagId);
    if (normalized) {
      set.add(normalized);
    }
  }
  return Array.from(set);
}

function assignmentShouldPersist(assignment: TagAssignment | null): assignment is TagAssignment {
  if (!assignment) {
    return false;
  }
  return assignment.starred || assignment.tagIds.length > 0;
}

function defaultAssignment(entityId: string, entityType: EntityType): TagAssignment {
  return {
    entityId,
    entityType,
    tagIds: [],
    starred: false,
    updatedAt: Date.now(),
  };
}

export class TagService {
  private pendingWrites = new Map<string, PendingAssignmentWrite>();

  async listTags(): Promise<Tag[]> {
    const tags = await tagRepository.getAllTags();
    return sortTagsByAnalytics(tags);
  }

  async createTag(name: string, color: string): Promise<Tag> {
    const normalizedName = normalizeName(name);
    const normalizedColor = normalizeColor(color);

    assertValidTagName(normalizedName);
    assertValidTagColor(normalizedColor);

    const tags = await tagRepository.getAllTags();
    const nameKey = toTagKey(normalizedName);

    if (tags.some((tag) => toTagKey(tag.name) === nameKey)) {
      throw new TagServiceError("CONFLICT", "Tag name already exists");
    }

    const now = Date.now();
    const tag: Tag = {
      id: makeTagId(),
      name: normalizedName,
      color: normalizedColor,
      createdAt: now,
      updatedAt: now,
      uses: 0,
      isSystem: false,
    };

    return await tagRepository.createTag(tag);
  }

  async renameTag(id: string, newName: string): Promise<Tag> {
    const normalizedId = normalizeId(id);
    const normalizedName = normalizeName(newName);

    assertValidTagId(normalizedId);
    assertValidTagName(normalizedName);

    const existing = await tagRepository.getTag(normalizedId);
    if (!existing) {
      throw new TagServiceError("NOT_FOUND", "Tag not found");
    }

    const tags = await tagRepository.getAllTags();
    const nameKey = toTagKey(normalizedName);

    if (
      tags.some(
        (tag) => tag.id !== normalizedId && toTagKey(tag.name) === nameKey,
      )
    ) {
      throw new TagServiceError("CONFLICT", "Tag name already exists");
    }

    const nextTag = markTagTouched(
      {
        ...existing,
        name: normalizedName,
      },
      Date.now(),
    );

    return await tagRepository.updateTag(nextTag);
  }

  async recolorTag(id: string, newColor: string): Promise<Tag> {
    const normalizedId = normalizeId(id);
    const normalizedColor = normalizeColor(newColor);

    assertValidTagId(normalizedId);
    assertValidTagColor(normalizedColor);

    const existing = await tagRepository.getTag(normalizedId);
    if (!existing) {
      throw new TagServiceError("NOT_FOUND", "Tag not found");
    }

    const nextTag = markTagTouched(
      {
        ...existing,
        color: normalizedColor,
      },
      Date.now(),
    );

    return await tagRepository.updateTag(nextTag);
  }

  async deleteTag(id: string): Promise<void> {
    const normalizedId = normalizeId(id);
    assertValidTagId(normalizedId);

    const existing = await tagRepository.getTag(normalizedId);
    if (!existing) {
      throw new TagServiceError("NOT_FOUND", "Tag not found");
    }

    if (existing.isSystem) {
      throw new TagServiceError("VALIDATION", "System tags cannot be deleted");
    }

    // Cascade delete assignments and remove tag record in RxDB
    await tagRepository.deleteTag(normalizedId);
  }

  async assignTag(entityId: string, tagId: string): Promise<void> {
    const normalizedEntityId = normalizeId(entityId);
    const normalizedTagId = normalizeId(tagId);

    assertValidEntityId(normalizedEntityId);
    assertValidTagId(normalizedTagId);

    const tag = await tagRepository.getTag(normalizedTagId);
    if (!tag) {
      throw new TagServiceError("NOT_FOUND", "Tag not found");
    }

    await this.scheduleAssignmentMutation(normalizedEntityId, (current) => {
      const next = current ?? defaultAssignment(normalizedEntityId, "file");
      const nextTagIds = uniqueTagIds([...next.tagIds, normalizedTagId]);

      return {
        ...next,
        tagIds: nextTagIds,
        updatedAt: Date.now(),
      };
    });
  }

  async assignTagToFolder(folderId: string, tagId: string): Promise<void> {
    const normalizedFolderId = normalizeId(folderId);
    const normalizedTagId = normalizeId(tagId);

    assertValidEntityId(normalizedFolderId);
    assertValidTagId(normalizedTagId);

    const tag = await tagRepository.getTag(normalizedTagId);
    if (!tag) {
      throw new TagServiceError("NOT_FOUND", "Tag not found");
    }

    await this.scheduleAssignmentMutation(normalizedFolderId, (current) => {
      const next = current ?? defaultAssignment(normalizedFolderId, "folder");
      const nextTagIds = uniqueTagIds([...next.tagIds, normalizedTagId]);

      return {
        ...next,
        entityType: "folder",
        tagIds: nextTagIds,
        updatedAt: Date.now(),
      };
    });
  }

  async removeTag(entityId: string, tagId: string): Promise<void> {
    const normalizedEntityId = normalizeId(entityId);
    const normalizedTagId = normalizeId(tagId);

    assertValidEntityId(normalizedEntityId);
    assertValidTagId(normalizedTagId);

    await this.scheduleAssignmentMutation(normalizedEntityId, (current) => {
      if (!current) {
        return null;
      }

      const nextTagIds = current.tagIds.filter((existingTagId) => existingTagId !== normalizedTagId);
      const nextAssignment: TagAssignment = {
        ...current,
        tagIds: nextTagIds,
        updatedAt: Date.now(),
      };

      return assignmentShouldPersist(nextAssignment) ? nextAssignment : null;
    });
  }

  async toggleStar(entityId: string): Promise<void> {
    const normalizedEntityId = normalizeId(entityId);

    assertValidEntityId(normalizedEntityId);

    await this.scheduleAssignmentMutation(normalizedEntityId, (current) => {
      const next = current ?? defaultAssignment(normalizedEntityId, "file");
      const toggled: TagAssignment = {
        ...next,
        starred: !next.starred,
        updatedAt: Date.now(),
      };

      return assignmentShouldPersist(toggled) ? toggled : null;
    });
  }

  async getAssignment(entityId: string): Promise<TagAssignment | null> {
    const normalizedEntityId = normalizeId(entityId);
    if (!normalizedEntityId) {
      return null;
    }

    return await tagRepository.getCompositeAssignment(normalizedEntityId);
  }

  async listAssignments(): Promise<TagAssignment[]> {
    return await tagRepository.getAllCompositeAssignments();
  }

  async filterEntitiesByTags(tagIds: string[], mode: FilterMode): Promise<string[]> {
    const normalizedTagIds = uniqueTagIds(tagIds);

    if (normalizedTagIds.length === 0) {
      const assignments = await tagRepository.getAllCompositeAssignments();
      return assignments.map((assignment) => assignment.entityId);
    }

    const sets: Set<string>[] = [];

    for (const tagId of normalizedTagIds) {
      const entityIds = await tagRepository.getEntitiesByTag(tagId);
      sets.push(new Set(entityIds));
    }

    if (sets.length === 0) {
      return [];
    }

    if (mode === "AND") {
      const [firstSet, ...restSets] = sets;
      if (!firstSet) {
        return [];
      }

      const result = new Set<string>();
      for (const candidate of firstSet) {
        const matchesAll = restSets.every((set) => set.has(candidate));
        if (matchesAll) {
          result.add(candidate);
        }
      }

      return Array.from(result);
    }

    const union = new Set<string>();
    for (const set of sets) {
      for (const item of set) {
        union.add(item);
      }
    }

    return Array.from(union);
  }

  async clearPendingWritesForTesting(): Promise<void> {
    for (const pending of this.pendingWrites.values()) {
      clearTimeout(pending.timer);
      for (const listener of pending.listeners) {
        listener.resolve();
      }
    }
    this.pendingWrites.clear();
  }

  private async scheduleAssignmentMutation(
    entityId: string,
    operation: AssignmentOperation,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = this.pendingWrites.get(entityId);

      if (existing) {
        clearTimeout(existing.timer);
        existing.operations.push(operation);
        existing.listeners.push({ resolve, reject });
        existing.timer = setTimeout(() => {
          void this.flushPendingAssignment(entityId);
        }, ASSIGNMENT_DEBOUNCE_MS);
        this.pendingWrites.set(entityId, existing);
        return;
      }

      const pending: PendingAssignmentWrite = {
        entityId,
        operations: [operation],
        listeners: [{ resolve, reject }],
        timer: setTimeout(() => {
          void this.flushPendingAssignment(entityId);
        }, ASSIGNMENT_DEBOUNCE_MS),
      };

      this.pendingWrites.set(entityId, pending);
    });
  }

  private async flushPendingAssignment(entityId: string): Promise<void> {
    const pending = this.pendingWrites.get(entityId);
    if (!pending) {
      return;
    }

    this.pendingWrites.delete(entityId);

    try {
      const previous = await tagRepository.getCompositeAssignment(entityId);
      let nextAssignment: TagAssignment | null = previous;

      for (const operation of pending.operations) {
        nextAssignment = operation(nextAssignment);
      }

      const previousTagIds = new Set(previous?.tagIds ?? []);
      const nextTagIds = new Set(nextAssignment?.tagIds ?? []);

      if (!assignmentShouldPersist(nextAssignment)) {
        await tagRepository.removeAllAssignmentsForEntity(entityId);
      } else {
        await tagRepository.upsertCompositeAssignment(nextAssignment);
      }

      const addedTagIds: string[] = [];
      for (const tagId of nextTagIds) {
        if (!previousTagIds.has(tagId)) {
          addedTagIds.push(tagId);
        }
      }

      if (addedTagIds.length > 0) {
        const timestamp = Date.now();

        for (const addedTagId of addedTagIds) {
          const tag = await tagRepository.getTag(addedTagId);
          if (!tag) {
            continue;
          }

          await tagRepository.updateTag(markTagUsed(tag, timestamp));
        }
      }

      for (const listener of pending.listeners) {
        listener.resolve();
      }
    } catch (error) {
      const serviceError = new TagServiceError("PERSISTENCE", "Failed to persist tag assignment", {
        cause: error,
      });

      for (const listener of pending.listeners) {
        listener.reject(serviceError);
      }
    }
  }
}
