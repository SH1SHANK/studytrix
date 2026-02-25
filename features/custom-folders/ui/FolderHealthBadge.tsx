"use client";

import { motion } from "framer-motion";

import type { FolderHealth } from "@/features/custom-folders/custom-folders.utils";

type FolderHealthBadgeProps = {
  health: FolderHealth;
};

const COLOUR_CLASS: Record<FolderHealth["colour"], string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  blue: "bg-sky-500",
  red: "bg-rose-500",
  muted: "bg-muted-foreground",
};

export function FolderHealthBadge({ health }: FolderHealthBadgeProps) {
  const dot = (
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${COLOUR_CLASS[health.colour]}`} />
  );

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {health.status === "syncing" ? (
        <motion.span
          className={`inline-block h-1.5 w-1.5 rounded-full ${COLOUR_CLASS[health.colour]}`}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        />
      ) : dot}
      {health.label}
    </span>
  );
}

