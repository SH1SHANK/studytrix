"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  IconCloudDown,
  IconFolder,
  IconStar,
  IconStarFilled,
  IconTag,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";

import { cn } from "@/lib/utils";
import { useTagStore } from "@/features/tags/tag.store";
import { useTagAssignmentStore } from "@/features/tags/tagAssignment.store";
import { Button } from "@/components/ui/button";
import { FolderActionsMenu } from "@/features/file/ui/folder/FolderActionsMenu";

const ACTION_PANEL_WIDTH = 180;
const SNAP_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 250;

const SPRING_CONFIG = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.8 };

type ListRowProps = {
  id: string;
  title: string;
  meta: string;
  variant?: "default" | "accent";
  isOpen?: boolean;
  onSwipeOpen?: (id: string) => void;
  onOpen?: () => void;
};

const noop = () => {};

function triggerHaptic(duration = 8) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

export function ListRow({
  id,
  title,
  meta,
  variant = "default",
  isOpen = false,
  onSwipeOpen,
  onOpen = noop,
}: ListRowProps) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const suppressClickRef = useRef(false);

  const { isStarred, toggleStar } = useTagStore(
    useShallow((state) => ({
      isStarred: Boolean(state.assignments[id]?.starred),
      toggleStar: state.toggleStar,
    })),
  );

  const { openDrawer } = useTagAssignmentStore(
    useShallow((state) => ({
      openDrawer: state.openDrawer,
    })),
  );

  const x = useMotionValue(0);

  // Progress 0 → 1 as swipe reveals actions
  const progress = useTransform(
    x,
    [-ACTION_PANEL_WIDTH, -ACTION_PANEL_WIDTH * 0.3, 0],
    [1, 0.3, 0],
  );

  // Staggered opacity for each action button (left → right reveal)
  const starOpacity = useTransform(progress, [0, 0.25, 0.6], [0, 0, 1]);
  const offlineOpacity = useTransform(progress, [0, 0.35, 0.7], [0, 0, 1]);
  const tagsOpacity = useTransform(progress, [0, 0.45, 0.8], [0, 0, 1]);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Sync with parent controlled open state
  useEffect(() => {
    const current = x.get();
    if (isOpen && current > -ACTION_PANEL_WIDTH + 5) {
      void animate(x, -ACTION_PANEL_WIDTH, SPRING_CONFIG);
    } else if (!isOpen && current < -5) {
      void animate(x, 0, SPRING_CONFIG);
    }
  }, [isOpen, x]);

  const snapOpen = useCallback(() => {
    triggerHaptic(6);
    void animate(x, -ACTION_PANEL_WIDTH, SPRING_CONFIG);
    onSwipeOpen?.(id);
  }, [id, onSwipeOpen, x]);

  const snapClose = useCallback(() => {
    void animate(x, 0, SPRING_CONFIG);
  }, [x]);

  function handleDragStart() {
    suppressClickRef.current = true;
  }

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const shouldOpen =
      info.offset.x < -SNAP_THRESHOLD ||
      info.velocity.x < -VELOCITY_THRESHOLD;

    if (shouldOpen) {
      snapOpen();
    } else {
      snapClose();
    }

    requestAnimationFrame(() => {
      suppressClickRef.current = false;
    });
  }

  function handleRowClick() {
    if (suppressClickRef.current) return;

    // If swiped open, close on tap
    if (x.get() < -10) {
      snapClose();
      return;
    }

    onOpen();
  }

  const handleToggleStar = useCallback(() => {
    triggerHaptic(6);
    void toggleStar(id).catch(() => undefined);
  }, [id, toggleStar]);

  const handleManageTags = useCallback(() => {
    triggerHaptic();
    openDrawer([{ id, type: "folder" }]);
  }, [id, openDrawer]);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* ── Action Panel (behind content) ─────────────────── */}
      <motion.div
        className="absolute inset-y-0 right-0 z-0 flex w-[180px] items-center justify-around rounded-r-xl bg-gradient-to-l from-muted/95 via-muted/85 to-muted/70 px-1"
        style={{ opacity: progress }}
      >
        {/* Star Action */}
        <motion.div style={{ opacity: starOpacity }}>
          <Button
            type="button"
            variant="ghost"
            aria-label={isStarred ? "Unstar folder" : "Star folder"}
            className={cn(
              "flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors duration-150",
              isStarred
                ? "text-amber-300 hover:bg-amber-500/15 hover:text-amber-200"
                : "text-amber-500 hover:bg-amber-500/15 hover:text-amber-300",
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStar();
            }}
          >
            {isStarred ? (
              <IconStarFilled className="size-5" />
            ) : (
              <IconStar className="size-5" />
            )}
            <span>{isStarred ? "Unstar" : "Star"}</span>
          </Button>
        </motion.div>

        {/* Offline Action */}
        <motion.div style={{ opacity: offlineOpacity }}>
          <Button
            type="button"
            variant="ghost"
            aria-label="Make available offline"
            className="flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-sky-400 transition-colors duration-150 hover:bg-sky-500/15 hover:text-sky-300"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key="unavailable"
                layout
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex flex-col items-center gap-1"
              >
                <IconCloudDown className="size-5 text-muted-foreground" />
                <span>Offline</span>
              </motion.div>
            </AnimatePresence>
          </Button>
        </motion.div>

        {/* Tags Action */}
        <motion.div style={{ opacity: tagsOpacity }}>
          <Button
            type="button"
            variant="ghost"
            aria-label="Assign tags"
            className="flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium text-primary transition-colors duration-150 hover:bg-primary/15 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              handleManageTags();
            }}
          >
            <IconTag className="size-5" />
            <span>Tags</span>
          </Button>
        </motion.div>
      </motion.div>

      {/* ── Draggable Content ─────────────────────────────── */}
      <motion.div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className={cn(
          "relative z-10 flex h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 shadow-sm transition-shadow duration-200 sm:h-[70px] sm:px-5",
          "hover:shadow-md active:scale-[0.99]",
          variant === "accent"
            ? "border-primary/35 bg-primary/10"
            : "border-border bg-card",
          isOpen && "ring-1 ring-ring/35",
        )}
        style={{ x, touchAction: "pan-y" }}
        drag={isTouchDevice ? "x" : false}
        dragConstraints={{ left: -ACTION_PANEL_WIDTH, right: 0 }}
        dragDirectionLock
        dragElastic={0.08}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <IconFolder className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground">
            {title}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {meta}
          </p>
        </div>

        {/* Desktop: actions menu; hidden on mobile where swipe is used */}
        <div className="ml-auto pl-2">
          <FolderActionsMenu
            entityId={id}
            title={title}
            description={meta}
            triggerClassName="size-11"
          />
        </div>
      </motion.div>
    </div>
  );
}
