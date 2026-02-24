"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type VerificationStageStatus =
  | "pending"
  | "running"
  | "success"
  | "warning"
  | "failed";

type VerificationStageProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  status: VerificationStageStatus;
  delayMs?: number;
};

function AnimatedCheckGlyph({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 20 20"
      className={cn("size-4", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.path
        d="M4.2 10.4l3.4 3.4 8.2-8.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

function AnimatedXGlyph({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 20 20"
      className={cn("size-4", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <motion.path
        d="M5 5l10 10M15 5L5 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

export function VerificationStage({
  icon: Icon,
  label,
  status,
  delayMs = 0,
}: VerificationStageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: delayMs / 1000 }}
      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <p className="truncate text-sm text-foreground">{label}</p>
      </div>

      <div className="flex size-5 shrink-0 items-center justify-center">
        {status === "running" ? <Loader2 className="size-4 animate-spin text-primary" /> : null}
        {status === "success" ? <AnimatedCheckGlyph className="text-primary" /> : null}
        {status === "warning" ? <AnimatedCheckGlyph className="text-amber-500" /> : null}
        {status === "failed" ? <AnimatedXGlyph className="text-destructive" /> : null}
      </div>
    </motion.div>
  );
}
