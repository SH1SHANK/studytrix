"use client";

import { motion } from "framer-motion";

type VerificationProgressProps = {
  completedCount: number;
  totalCount?: number;
};

export function VerificationProgress({
  completedCount,
  totalCount = 5,
}: VerificationProgressProps) {
  const safeTotal = Math.max(1, totalCount);
  const clamped = Math.max(0, Math.min(completedCount, safeTotal));
  const progress = (clamped / safeTotal) * 100;

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={false}
        animate={{ width: `${progress}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}
