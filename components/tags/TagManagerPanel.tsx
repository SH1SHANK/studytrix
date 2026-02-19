"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  IconCheck,
  IconLoader2,
  IconPencil,
  IconTag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTagStore } from "@/features/tags/tag.store";
import { getTagChipTextColor } from "@/features/tags/tag.filter";

const TAG_NAME_MIN_LENGTH = 2;
const TAG_NAME_MAX_LENGTH = 50;
const TAG_COLOR_PALETTE = [
  "#2563EB",
  "#16A34A",
  "#EA580C",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#D97706",
  "#0F766E",
] as const;

function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function TagManagerPanel() {
  const createNameId = useId();
  const statusId = useId();
  const hydrationRequestedRef = useRef(false);
  const {
    tags,
    assignments,
    isHydrated,
    hydrate,
    addTag,
    renameTag,
    recolorTag,
    removeTag,
  } = useTagStore(
    useShallow((state) => ({
      tags: state.tags,
      assignments: state.assignments,
      isHydrated: state.isHydrated,
      hydrate: state.hydrate,
      addTag: state.addTag,
      renameTag: state.renameTag,
      recolorTag: state.recolorTag,
      removeTag: state.removeTag,
    })),
  );

  const [createName, setCreateName] = useState("");
  const [createColor, setCreateColor] = useState<string>(TAG_COLOR_PALETTE[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(TAG_COLOR_PALETTE[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingTagId, setIsDeletingTagId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated || hydrationRequestedRef.current) {
      return;
    }

    hydrationRequestedRef.current = true;
    void hydrate().catch((error: unknown) => {
      hydrationRequestedRef.current = false;
      const message = error instanceof Error ? error.message : "Failed to load tags";
      setStatusMessage(null);
      setErrorMessage(message);
    });
  }, [hydrate, isHydrated]);

  const assignmentCountByTag = useMemo(() => {
    const counts = new Map<string, number>();

    for (const assignment of Object.values(assignments)) {
      const uniqueTagIds = new Set(assignment.tagIds);
      for (const tagId of uniqueTagIds) {
        counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
      }
    }

    return counts;
  }, [assignments]);

  const sortedTags = useMemo(() => {
    return [...tags].sort((left, right) => {
      if (left.isSystem !== right.isSystem) {
        return left.isSystem ? -1 : 1;
      }

      if (left.uses !== right.uses) {
        return right.uses - left.uses;
      }

      return left.name.localeCompare(right.name);
    });
  }, [tags]);

  const resetMessages = useCallback(() => {
    if (errorMessage) {
      setErrorMessage(null);
    }
    if (statusMessage) {
      setStatusMessage(null);
    }
  }, [errorMessage, statusMessage]);

  const handleCreateTag = useCallback(async () => {
    const normalizedName = normalizeTagName(createName);
    if (normalizedName.length < TAG_NAME_MIN_LENGTH) {
      setStatusMessage(null);
      setErrorMessage(`Tag name must be at least ${TAG_NAME_MIN_LENGTH} characters.`);
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const created = await addTag(normalizedName, createColor);
      setCreateName("");
      setStatusMessage(`Created tag "${created.name}".`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create tag";
      setStatusMessage(null);
      setErrorMessage(message);
    } finally {
      setIsCreating(false);
    }
  }, [addTag, createColor, createName]);

  const startEdit = useCallback((tagId: string, tagName: string, tagColor: string) => {
    setEditingTagId(tagId);
    setEditName(tagName);
    setEditColor(tagColor);
    resetMessages();
  }, [resetMessages]);

  const cancelEdit = useCallback(() => {
    setEditingTagId(null);
    setEditName("");
    setEditColor(TAG_COLOR_PALETTE[0]);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingTagId) {
      return;
    }

    const normalizedName = normalizeTagName(editName);
    if (normalizedName.length < TAG_NAME_MIN_LENGTH) {
      setStatusMessage(null);
      setErrorMessage(`Tag name must be at least ${TAG_NAME_MIN_LENGTH} characters.`);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await Promise.all([
        renameTag(editingTagId, normalizedName),
        recolorTag(editingTagId, editColor),
      ]);
      setStatusMessage("Tag updated.");
      cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update tag";
      setStatusMessage(null);
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  }, [cancelEdit, editColor, editName, editingTagId, recolorTag, renameTag]);

  const handleDeleteTag = useCallback(async (tagId: string, tagName: string) => {
    const confirmed = window.confirm(`Delete "${tagName}"? This removes it from all files and folders.`);
    if (!confirmed) {
      return;
    }

    setIsDeletingTagId(tagId);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await removeTag(tagId);
      if (editingTagId === tagId) {
        cancelEdit();
      }
      setStatusMessage(`Deleted tag "${tagName}".`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete tag";
      setStatusMessage(null);
      setErrorMessage(message);
    } finally {
      setIsDeletingTagId(null);
    }
  }, [cancelEdit, editingTagId, removeTag]);

  const canCreateTag = normalizeTagName(createName).length >= TAG_NAME_MIN_LENGTH && !isCreating;
  const canSaveEdit = normalizeTagName(editName).length >= TAG_NAME_MIN_LENGTH && !isSaving;

  return (
    <section className="space-y-4" aria-labelledby="tags-manager-title">
      <header className="space-y-1">
        <h1 id="tags-manager-title" className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Manage Tags
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Create, edit, and remove tags used across files and folders.
        </p>
      </header>

      <section aria-label="Create tag" className="rounded-xl border border-stone-200/70 bg-white/80 p-4 dark:border-stone-700/80 dark:bg-stone-900/70">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor={createNameId} className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Tag name
            </label>
            <Input
              id={createNameId}
              value={createName}
              onChange={(event) => {
                setCreateName(event.target.value);
                resetMessages();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreateTag();
                }
              }}
              placeholder="e.g. Midterm"
              maxLength={TAG_NAME_MAX_LENGTH}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-stone-700 dark:text-stone-300">Color</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose tag color">
              {TAG_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={createColor === color}
                  onClick={() => {
                    setCreateColor(color);
                    resetMessages();
                  }}
                  className={`size-6 rounded-full border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
                    createColor === color
                      ? "border-stone-900 ring-1 ring-stone-900 dark:border-stone-100 dark:ring-stone-100"
                      : "border-stone-300 dark:border-stone-600"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select ${color}`}
                />
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void handleCreateTag();
            }}
            disabled={!canCreateTag}
          >
            {isCreating ? (
              <>
                <IconLoader2 className="size-3.5 animate-spin" />
                Creating
              </>
            ) : (
              <>
                <IconTag className="size-3.5" />
                Create Tag
              </>
            )}
          </Button>
        </div>
      </section>

      <section aria-label="Tag list" className="space-y-2">
        {sortedTags.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 p-3 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
            No tags yet. Create your first tag above.
          </p>
        ) : (
          sortedTags.map((tag) => {
            const isEditing = editingTagId === tag.id;
            const isDeleting = isDeletingTagId === tag.id;
            const assignmentCount = assignmentCountByTag.get(tag.id) ?? 0;
            const chipTextColor = getTagChipTextColor(tag.color);

            return (
              <article
                key={tag.id}
                className="rounded-xl border border-stone-200/70 bg-white/80 p-3 dark:border-stone-700/80 dark:bg-stone-900/70"
                aria-label={`${tag.name} tag`}
              >
                {!isEditing ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: tag.color, color: chipTextColor }}
                        >
                          {tag.name}
                        </span>
                        {tag.isSystem ? (
                          <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                            System
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Used {tag.uses} times · Assigned to {assignmentCount} item{assignmentCount === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          startEdit(tag.id, tag.name, tag.color);
                        }}
                        aria-label={`Edit ${tag.name}`}
                      >
                        <IconPencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void handleDeleteTag(tag.id, tag.name);
                        }}
                        disabled={tag.isSystem || isDeleting}
                        aria-label={`Delete ${tag.name}`}
                      >
                        {isDeleting ? (
                          <IconLoader2 className="size-3.5 animate-spin" />
                        ) : (
                          <IconTrash className="size-3.5" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-stone-700 dark:text-stone-300" htmlFor={`edit-tag-${tag.id}`}>
                        Edit name
                      </label>
                      <Input
                        id={`edit-tag-${tag.id}`}
                        value={editName}
                        onChange={(event) => {
                          setEditName(event.target.value);
                          resetMessages();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSaveEdit();
                          }
                        }}
                        maxLength={TAG_NAME_MAX_LENGTH}
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Select color for ${tag.name}`}>
                      {TAG_COLOR_PALETTE.map((color) => (
                        <button
                          key={`edit-${tag.id}-${color}`}
                          type="button"
                          role="radio"
                          aria-checked={editColor === color}
                          onClick={() => {
                            setEditColor(color);
                            resetMessages();
                          }}
                          className={`size-6 rounded-full border transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
                            editColor === color
                              ? "border-stone-900 ring-1 ring-stone-900 dark:border-stone-100 dark:ring-stone-100"
                              : "border-stone-300 dark:border-stone-600"
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select ${color}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void handleSaveEdit();
                        }}
                        disabled={!canSaveEdit}
                      >
                        {isSaving ? (
                          <IconLoader2 className="size-3.5 animate-spin" />
                        ) : (
                          <IconCheck className="size-3.5" />
                        )}
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={isSaving}
                      >
                        <IconX className="size-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      <section aria-live="polite" aria-atomic="true">
        <p id={statusId} className="sr-only">
          {errorMessage ?? statusMessage ?? ""}
        </p>
        {errorMessage ? (
          <p role="status" className="text-sm text-rose-600 dark:text-rose-300">
            {errorMessage}
          </p>
        ) : null}
        {statusMessage ? (
          <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
            {statusMessage}
          </p>
        ) : null}
      </section>
    </section>
  );
}
