import { map, Observable } from "rxjs";
import { getDatabase } from "../database";
import type { TagAssignmentDocType, TagDocType } from "../types";

export interface CompositeTagAssignment {
  entityId: string;
  entityType: "file" | "folder";
  tagIds: string[];
  starred: boolean;
  updatedAt: number;
}

function makeAssignmentId(entityId: string, tagId: string): string {
  return `${entityId.trim()}:${tagId.trim()}`;
}

export class TagRepository {
  // --- Tags ---

  async getAllTags(): Promise<TagDocType[]> {
    const db = await getDatabase();
    const docs = await db.tags.find().exec();
    return docs.map((doc) => doc.toJSON() as TagDocType);
  }

  async getTag(id: string): Promise<TagDocType | null> {
    const db = await getDatabase();
    const doc = await db.tags.findOne(id).exec();
    return doc ? (doc.toJSON() as TagDocType) : null;
  }

  async createTag(tag: TagDocType): Promise<TagDocType> {
    const db = await getDatabase();
    const inserted = await db.tags.insert(tag);
    return inserted.toJSON() as TagDocType;
  }

  async updateTag(tag: TagDocType): Promise<TagDocType> {
    const db = await getDatabase();
    const doc = await db.tags.findOne(tag.id).exec();
    if (!doc) {
      return await this.createTag(tag);
    }
    const updated = await doc.incrementalPatch({
      ...tag,
      updatedAt: Date.now(),
    });
    return updated.toJSON() as TagDocType;
  }

  async deleteTag(id: string): Promise<void> {
    const db = await getDatabase();
    const doc = await db.tags.findOne(id).exec();
    if (doc) {
      await doc.remove();
    }

    // Batch cascade delete all tag assignments referencing this tag
    const assignments = await db.tag_assignments
      .find({ selector: { tagId: id } })
      .exec();
    if (assignments.length > 0) {
      await db.tag_assignments.bulkRemove(assignments.map((a) => a.id));
    }
  }

  async bulkUpsertTags(tags: TagDocType[]): Promise<void> {
    if (tags.length === 0) return;
    const db = await getDatabase();
    await db.tags.bulkUpsert(tags);
  }

  observeTags(): Observable<TagDocType[]> {
    return new Observable<TagDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.tags.find().$.pipe(
            map((docs) => docs.map((d) => d.toJSON() as TagDocType)),
          );
          subscription = query$.subscribe({
            next: (data) => subscriber.next(data),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        })
        .catch((err) => subscriber.error(err));

      return () => {
        isSubscribed = false;
        subscription?.unsubscribe();
      };
    });
  }

  // --- Tag Assignments ---

  async getAssignmentsForEntity(entityId: string): Promise<TagAssignmentDocType[]> {
    const db = await getDatabase();
    const docs = await db.tag_assignments
      .find({ selector: { entityId: entityId.trim() } })
      .exec();
    return docs.map((doc) => doc.toJSON() as TagAssignmentDocType);
  }

  async getCompositeAssignment(entityId: string): Promise<CompositeTagAssignment | null> {
    const docs = await this.getAssignmentsForEntity(entityId);
    if (docs.length === 0) return null;

    const first = docs[0];
    const tagIds = docs.map((d) => d.tagId).filter((t) => t !== "starred");
    const starred = docs.some((d) => d.starred);
    const maxUpdatedAt = Math.max(...docs.map((d) => d.updatedAt));

    return {
      entityId: first.entityId,
      entityType: first.entityType,
      tagIds,
      starred,
      updatedAt: maxUpdatedAt,
    };
  }

  async getAllCompositeAssignments(): Promise<CompositeTagAssignment[]> {
    const docs = await this.getAllAssignments();
    const map = new Map<string, TagAssignmentDocType[]>();

    for (const doc of docs) {
      const list = map.get(doc.entityId) || [];
      list.push(doc);
      map.set(doc.entityId, list);
    }

    const results: CompositeTagAssignment[] = [];
    for (const [entityId, entityDocs] of map.entries()) {
      const first = entityDocs[0];
      results.push({
        entityId,
        entityType: first.entityType,
        tagIds: entityDocs.map((d) => d.tagId).filter((t) => t !== "starred"),
        starred: entityDocs.some((d) => d.starred),
        updatedAt: Math.max(...entityDocs.map((d) => d.updatedAt)),
      });
    }

    return results;
  }

  async upsertCompositeAssignment(assignment: CompositeTagAssignment): Promise<CompositeTagAssignment> {
    const existingDocs = await this.getAssignmentsForEntity(assignment.entityId);
    const newTagSet = new Set(assignment.tagIds);

    // Remove unassigned tags
    for (const existingDoc of existingDocs) {
      if (!newTagSet.has(existingDoc.tagId) && existingDoc.tagId !== "starred") {
        await this.removeAssignment(assignment.entityId, existingDoc.tagId);
      }
    }

    // Assign current tags
    for (const tagId of assignment.tagIds) {
      await this.assignTag(
        assignment.entityId,
        tagId,
        assignment.entityType,
        assignment.starred,
      );
    }

    // If no tagIds but starred, maintain star state
    if (assignment.tagIds.length === 0 && assignment.starred) {
      await this.assignTag(
        assignment.entityId,
        "starred",
        assignment.entityType,
        true,
      );
    } else if (assignment.tagIds.length > 0) {
      // Remove placeholder "starred" if now has concrete tags
      await this.removeAssignment(assignment.entityId, "starred");
    }

    return assignment;
  }

  async getAllAssignments(): Promise<TagAssignmentDocType[]> {
    const db = await getDatabase();
    const docs = await db.tag_assignments.find().exec();
    return docs.map((doc) => doc.toJSON() as TagAssignmentDocType);
  }

  async assignTag(
    entityId: string,
    tagId: string,
    entityType: "file" | "folder" = "file",
    starred = false,
  ): Promise<TagAssignmentDocType> {
    const db = await getDatabase();
    const id = makeAssignmentId(entityId, tagId);
    const now = Date.now();

    const existing = await db.tag_assignments.findOne(id).exec();
    if (existing) {
      const patched = await existing.incrementalPatch({
        starred,
        updatedAt: now,
      });
      return patched.toJSON() as TagAssignmentDocType;
    }

    const doc = await db.tag_assignments.insert({
      id,
      entityId: entityId.trim(),
      entityType,
      tagId: tagId.trim(),
      starred,
      createdAt: now,
      updatedAt: now,
    });
    return doc.toJSON() as TagAssignmentDocType;
  }

  async removeAssignment(entityId: string, tagId: string): Promise<void> {
    const db = await getDatabase();
    const id = makeAssignmentId(entityId, tagId);
    const doc = await db.tag_assignments.findOne(id).exec();
    if (doc) {
      await doc.remove();
    }
  }

  async removeAllAssignmentsForEntity(entityId: string): Promise<void> {
    const db = await getDatabase();
    const docs = await db.tag_assignments
      .find({ selector: { entityId: entityId.trim() } })
      .exec();
    if (docs.length > 0) {
      await db.tag_assignments.bulkRemove(docs.map((d) => d.id));
    }
  }

  async getEntitiesByTag(tagId: string): Promise<string[]> {
    const db = await getDatabase();
    const docs = await db.tag_assignments
      .find({ selector: { tagId: tagId.trim() } })
      .exec();
    return Array.from(new Set(docs.map((d) => d.entityId)));
  }

  async bulkUpsertAssignments(assignments: TagAssignmentDocType[]): Promise<void> {
    if (assignments.length === 0) return;
    const db = await getDatabase();
    await db.tag_assignments.bulkUpsert(assignments);
  }

  observeAssignments(): Observable<TagAssignmentDocType[]> {
    return new Observable<TagAssignmentDocType[]>((subscriber) => {
      let isSubscribed = true;
      let subscription: { unsubscribe: () => void } | null = null;

      getDatabase()
        .then((db) => {
          if (!isSubscribed) return;
          const query$ = db.tag_assignments.find().$.pipe(
            map((docs) => docs.map((d) => d.toJSON() as TagAssignmentDocType)),
          );
          subscription = query$.subscribe({
            next: (data) => subscriber.next(data),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        })
        .catch((err) => subscriber.error(err));

      return () => {
        isSubscribed = false;
        subscription?.unsubscribe();
      };
    });
  }
}

export const tagRepository = new TagRepository();
