"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import {
  IconCloudDown,
  IconFolder,
  IconPin,
  IconTrash,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { FolderActionsMenu } from "@/components/folder/FolderActionsMenu";

const ACTION_PANEL_WIDTH = 132;
const SNAP_THRESHOLD = 60;

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

  const x = useMotionValue(0);
  const actionOpacity = useTransform(
    x,
    [-ACTION_PANEL_WIDTH, -30, 0],
    [1, 0.5, 0],
  );

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Sync with parent controlled open state — close when another row opens
  useEffect(() => {
    if (!isOpen && x.get() !== 0) {
      x.set(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleDragStart() {
    suppressClickRef.current = true;
  }

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    if (info.offset.x < -SNAP_THRESHOLD) {
      // Snap open
      x.set(-ACTION_PANEL_WIDTH);
      onSwipeOpen?.(id);
    } else {
      // Snap closed
      x.set(0);
    }

    requestAnimationFrame(() => {
      suppressClickRef.current = false;
    });
  }

  function handleRowClick() {
    if (suppressClickRef.current) return;

    // If swiped open, close on tap
    if (x.get() < -10) {
      x.set(0);
      return;
    }

    onOpen();
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Action Layer — static, behind content, always mounted */}
      <motion.div
        className="absolute inset-y-0 right-0 z-0 flex w-[132px] items-center justify-around bg-stone-800 dark:bg-stone-700"
        style={{ opacity: actionOpacity }}
      >
        <button
          type="button"
          aria-label="Pin folder"
          className="flex h-11 w-11 items-center justify-center rounded-md text-stone-300 transition-colors duration-200 hover:bg-stone-700 hover:text-stone-100 dark:hover:bg-stone-600"
          onClick={(e) => e.stopPropagation()}
        >
          <IconPin className="size-4 opacity-80" />
        </button>
        <button
          type="button"
          aria-label="Make available offline"
          className="flex h-11 w-11 items-center justify-center rounded-md text-stone-300 transition-colors duration-200 hover:bg-stone-700 hover:text-stone-100 dark:hover:bg-stone-600"
          onClick={(e) => e.stopPropagation()}
        >
          <IconCloudDown className="size-4 opacity-80" />
        </button>
        <button
          type="button"
          aria-label="Delete folder"
          className="flex h-11 w-11 items-center justify-center rounded-md text-stone-300 transition-colors duration-200 hover:bg-stone-700 hover:text-rose-400 dark:hover:bg-stone-600"
          onClick={(e) => e.stopPropagation()}
        >
          <IconTrash className="size-4 opacity-80" />
        </button>
      </motion.div>

      {/* Draggable Content Layer — slides left to reveal actions */}
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
          "relative z-10 flex h-16 cursor-pointer items-center gap-3 rounded-lg border px-4",
          variant === "accent"
            ? "border-indigo-200/60 bg-indigo-50/70 dark:border-indigo-800/50 dark:bg-indigo-950/30"
            : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900",
        )}
        style={{ x }}
        drag={isTouchDevice ? "x" : false}
        dragConstraints={{ left: -ACTION_PANEL_WIDTH, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-indigo-600 dark:bg-stone-800 dark:text-indigo-400">
          <IconFolder className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
            {title}
          </h3>
          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
            {meta}
          </p>
        </div>

        {/* Desktop: show actions menu; hidden on mobile where swipe is used */}
        {!isTouchDevice && (
          <div className="ml-auto pl-2">
            <FolderActionsMenu triggerClassName="size-11" />
          </div>
        )}
      </motion.div>
    </div>
  );
}
