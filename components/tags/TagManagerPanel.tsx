"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  IconCheck,
  IconChevronRight,
  IconDots,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconTag,
  IconTags,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useTagStore } from "@/features/tags/tag.store";
import { getTagChipTextColor } from "@/features/tags/tag.filter";
import { getTagColorPalette } from "@/features/theme/theme.constants";

const TAG_NAME_MIN_LENGTH = 2;
const TAG_NAME_MAX_LENGTH = 50;

function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function TagManagerPanel() {
  const router = useRouter();
  const { theme } = useTheme();
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

  const tagColorPalette = useMemo(() => getTagColorPalette(theme), [theme]);

  const [createName, setCreateName] = useState("");
  const [createColor, setCreateColor] = useState<string>(tagColorPalette[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(tagColorPalette[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingTagId, setIsDeletingTagId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return sortedTags;
    const q = searchQuery.trim().toLowerCase();
    return sortedTags.filter((tag) => tag.name.toLowerCase().includes(q));
  }, [sortedTags, searchQuery]);

  useEffect(() => {
    if (!tagColorPalette.includes(createColor)) {
      setCreateColor(tagColorPalette[0]);
    }
  }, [createColor, tagColorPalette]);

  useEffect(() => {
    if (!tagColorPalette.includes(editColor)) {
      setEditColor(tagColorPalette[0]);
    }
  }, [editColor, tagColorPalette]);

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
    setEditColor(tagColorPalette[0]);
  }, [tagColorPalette]);

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
    <section className="space-y-5" aria-labelledby="tags-manager-title">
      {/* ── Hero Header ──────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-sm border-border/80 bg-card/85">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
        <div className="flex items-center gap-3 p-5 pt-6">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15">
            <IconTags className="size-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="space-y-0.5">
            <h1 id="tags-manager-title" className="text-xl font-semibold tracking-tight text-foreground">
              Manage Tags
            </h1>
            <p className="text-sm text-muted-foreground">
              Create, edit, and organise tags used across files and folders.
            </p>
          </div>
        </div>
      </header>

      {/* ── Create Tag Card ──────────────────────────────────── */}
      <section
        aria-label="Create tag"
        className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm border-border/80 bg-card/70"
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-400 to-violet-500" />
        <div className="space-y-3 p-4 pl-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
            New Tag
          </p>
          <div className="space-y-1.5">
            <label htmlFor={createNameId} className="text-xs font-medium text-foreground/80 text-muted-foreground">
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
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground/80 text-muted-foreground">Color</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose tag color">
                  {tagColorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={createColor === color}
                  onClick={() => {
                    setCreateColor(color);
                    resetMessages();
                  }}
                  className={`size-7 rounded-full border-2 transition-all duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
                    createColor === color
                        ? "border-foreground shadow-sm"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select ${color}`}
                />
              ))}
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-4 text-xs"
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

      {/* ── Search Bar ───────────────────────────────────────── */}
      {sortedTags.length > 3 && (
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags…"
            className="h-9 rounded-xl pl-9"
          />
        </div>
      )}

      {/* ── Tag List ─────────────────────────────────────────── */}
      <section aria-label="Tag list" className="space-y-2">
        {filteredTags.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center border-border">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <IconTags className="size-6 text-muted-foreground/80" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery.trim() ? "No matching tags" : "No tags yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchQuery.trim()
                  ? "Try a different search term."
                  : "Create your first tag above to start organising."}
              </p>
            </div>
          </div>
        ) : (
          filteredTags.map((tag) => {
            const isEditing = editingTagId === tag.id;
            const isDeleting = isDeletingTagId === tag.id;
            const assignmentCount = assignmentCountByTag.get(tag.id) ?? 0;
            const chipTextColor = getTagChipTextColor(tag.color);

            return (
              <article
                key={tag.id}
                className="group rounded-2xl border border-border/70 bg-card/80 transition-shadow hover:shadow-sm border-border/80 bg-card/70"
                aria-label={`${tag.name} tag`}
              >
                {!isEditing ? (
                  <div className="flex items-center gap-3 p-3.5">
                    {/* Color dot */}
                    <span
                      className="size-3 shrink-0 rounded-full ring-2 ring-background ring-background"
                      style={{ backgroundColor: tag.color }}
                    />

                    {/* Tag info */}
                    <div className="min-w-0 flex-1">
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        {assignmentCount} file{assignmentCount === 1 ? "" : "s"} · Used {tag.uses} times
                      </p>
                    </div>

                    {/* View Files button */}
                    <button
                      type="button"
                      onClick={() => router.push(`/tags/${tag.id}`)}
                      className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                      View Files
                      <IconChevronRight className="size-3.5" />
                    </button>

                    {/* Actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                            aria-label={`Actions for ${tag.name}`}
                          />
                        }
                      >
                        <IconDots className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={() => {
                            startEdit(tag.id, tag.name, tag.color);
                          }}
                        >
                          <IconPencil className="size-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            void handleDeleteTag(tag.id, tag.name);
                          }}
                          disabled={tag.isSystem || isDeleting}
                          className="text-rose-600 focus:text-rose-600 dark:text-rose-400 dark:focus:text-rose-400"
                        >
                          {isDeleting ? (
                            <IconLoader2 className="size-3.5 animate-spin" />
                          ) : (
                            <IconTrash className="size-3.5" />
                          )}
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  /* ── Inline Edit Mode ─────────────────────────── */
                  <div className="space-y-3 p-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground/80 text-muted-foreground" htmlFor={`edit-tag-${tag.id}`}>
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
                        className="h-9"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Select color for ${tag.name}`}>
                      {tagColorPalette.map((color) => (
                        <button
                          key={`edit-${tag.id}-${color}`}
                          type="button"
                          role="radio"
                          aria-checked={editColor === color}
                          onClick={() => {
                            setEditColor(color);
                            resetMessages();
                          }}
                          className={`size-7 rounded-full border-2 transition-all duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
                            editColor === color
                              ? "border-foreground shadow-sm"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select ${color}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="h-8 gap-1.5 rounded-full px-4 text-xs"
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
                        className="h-8 gap-1 rounded-full px-3 text-xs"
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

      {/* ── Status Messages ──────────────────────────────────── */}
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
