"use client";

import { motion } from "framer-motion";

export function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="rounded-xl border border-border p-3"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="onboarding-skeleton size-8 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="onboarding-skeleton h-3 w-3/5 rounded" />
          <div className="onboarding-skeleton h-2.5 w-2/5 rounded" />
        </div>
      </div>
      <div className="onboarding-skeleton h-9 w-full rounded-lg" />
    </motion.div>
  );
}
