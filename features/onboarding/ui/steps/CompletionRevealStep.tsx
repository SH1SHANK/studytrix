"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconCheck } from "@tabler/icons-react";

type CompletionRevealStepProps = {
  userName: string;
  onDone: () => void;
};

export function CompletionRevealStep({ userName, onDone }: CompletionRevealStepProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDone();
    }, 1400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onDone]);

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden px-4 py-6 text-center sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.2),transparent_60%)]" />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.08, y: -8 }}
          transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.7 }}
          className="relative z-10 space-y-4"
        >
          <motion.div
            className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary"
            initial={{ rotate: -10 }}
            animate={{ rotate: [0, 6, 0] }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <IconCheck className="size-8" />
          </motion.div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            You&apos;re all set, {userName}.
          </h2>
          <p className="text-sm text-muted-foreground">
            Preparing your dashboard now.
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
