"use client";

import { motion } from "framer-motion";

export function SkeletonRow() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-3 rounded-xl border border-border p-3"
    >
      <div className="onboarding-skeleton size-5 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="onboarding-skeleton h-3 w-2/3 rounded" />
        <div className="onboarding-skeleton h-2.5 w-1/2 rounded" />
      </div>
    </motion.div>
  );
}
