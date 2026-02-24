"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconFile,
  IconFolder,
  IconLoader2,
  IconTag,
  IconTagOff,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { useTagStore } from "@/features/tags/tag.store";
import { getTagChipTextColor } from "@/features/tags/tag.filter";
import type { EntityType } from "@/features/tags/tag.types";
import { getFileMetadataWithCache } from "@/features/file/file-metadata.client";

interface TagFilesViewProps {
  tagId: string;
}

export function TagFilesView({ tagId }: TagFilesViewProps) {
  const router = useRouter();
  const hydrationRef = useRef(false);

  const { tags, assignments, isHydrated, hydrate } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
      assignments: state.assignments,
      isHydrated: state.isHydrated,
      hydrate: state.hydrate,
    })),
  );

  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});
  const [loadingNames, setLoadingNames] = useState(true);

  // Hydrate tags if needed
  useEffect(() => {
    if (isHydrated || hydrationRef.current) return;
    hydrationRef.current = true;
    void hydrate();
  }, [hydrate, isHydrated]);

  // Find the tag
  const tag = useMemo(() => tags.find((t) => t.id === tagId), [tags, tagId]);

  // Find all entities assigned to this tag
  const matchedEntities = useMemo(() => {
    const results: { entityId: string; entityType: EntityType }[] = [];

    for (const [entityId, assignment] of Object.entries(assignments)) {
      if (assignment.tagIds.includes(tagId)) {
        results.push({
          entityId,
          entityType: assignment.entityType,
        });
      }
    }

    return results.sort((a, b) => {
      // Folders first, then files
      if (a.entityType !== b.entityType) {
        return a.entityType === "folder" ? -1 : 1;
      }
      return a.entityId.localeCompare(b.entityId);
    });
  }, [assignments, tagId]);

  // Resolve display names
  useEffect(() => {
    if (!isHydrated || matchedEntities.length === 0) {
      setLoadingNames(false);
      return;
    }

    const controller = new AbortController();
    setLoadingNames(true);

    void (async () => {
      const entries = await Promise.all(
        matchedEntities.map(async (entity) => {
          try {
            const resolved = await getFileMetadataWithCache(entity.entityId, {
              signal: controller.signal,
            });
            const name = resolved.metadata?.name;
            if (!name || !name.trim()) {
              return null;
            }

            return [entity.entityId, name.trim()] as const;
          } catch {
            return null;
          }
        }),
      );

      if (controller.signal.aborted) return;

      const resolved: Record<string, string> = {};
      for (const entry of entries) {
        if (entry) {
          resolved[entry[0]] = entry[1];
        }
      }
      setResolvedNames(resolved);
      setLoadingNames(false);
    })();

    return () => {
      controller.abort();
    };
  }, [isHydrated, matchedEntities]);

  const chipTextColor = tag ? getTagChipTextColor(tag.color) : "var(--primary-foreground)";

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <IconLoader2 className="size-6 animate-spin text-muted-foreground/80" />
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="space-y-4 px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3 text-xs"
          onClick={() => router.push("/tags")}
        >
          <IconArrowLeft className="size-3.5" />
          Back to Tags
        </Button>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center border-border">
          <IconTagOff className="size-8 text-muted-foreground/80" />
          <p className="text-sm font-medium text-muted-foreground">
            Tag not found
          </p>
          <p className="text-xs text-muted-foreground">
            This tag may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Tag Banner ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 shadow-sm border-border/80">
        {/* Color banner */}
        <div
          className="h-16 sm:h-20"
          style={{
            background: `linear-gradient(135deg, ${tag.color}, ${tag.color}88)`,
          }}
        />
        <div className="relative bg-card/90 p-4 bg-card/90">
          {/* Floating tag chip */}
          <div className="absolute -top-4 left-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-background px-3 py-1 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: tag.color, color: chipTextColor }}
            >
              <IconTag className="size-3.5" />
              {tag.name}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {matchedEntities.length} item{matchedEntities.length === 1 ? "" : "s"} tagged
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-full px-3 text-xs"
              onClick={() => router.push("/tags")}
            >
              <IconArrowLeft className="size-3.5" />
              All Tags
            </Button>
          </div>
        </div>
      </div>

      {/* ── Entity List ──────────────────────────────────────── */}
      {matchedEntities.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center border-border">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <IconTagOff className="size-6 text-muted-foreground/80" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              No files tagged yet
            </p>
            <p className="text-xs text-muted-foreground">
              Assign the &ldquo;{tag.name}&rdquo; tag to files or folders to see them here.
            </p>
          </div>
        </div>
      ) : loadingNames ? (
        <div className="flex items-center justify-center py-10">
          <IconLoader2 className="size-5 animate-spin text-muted-foreground/80" />
          <span className="ml-2 text-sm text-muted-foreground">Loading files…</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {matchedEntities.map((entity) => {
            const displayName = resolvedNames[entity.entityId] || entity.entityId;
            const isFolder = entity.entityType === "folder";
            const EntityIcon = isFolder ? IconFolder : IconFile;

            return (
              <li
                key={entity.entityId}
                className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 p-3.5 transition-shadow hover:shadow-sm border-border/80 bg-card/70"
              >
                <div
                  className="flex size-9 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${tag.color}18`,
                  }}
                >
                  <EntityIcon
                    className="size-4.5"
                    style={{ color: tag.color }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {entity.entityType}
                  </p>
                </div>

                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
