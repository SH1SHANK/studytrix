"use client";

import { IconHexagon } from "@tabler/icons-react";
import { motion } from "framer-motion";

import { LetterReveal } from "@/components/onboarding/shared/LetterReveal";

export function OnboardingLoadingScreen() {
  return (
    <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="onboarding-logo-glow h-32 w-32 rounded-full bg-primary/12" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.4, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 460, damping: 30, mass: 0.72 }}
          className="mb-4 inline-flex size-16 items-center justify-center rounded-2xl border border-border bg-card/80 text-primary"
        >
          <IconHexagon className="size-8" />
        </motion.div>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          <LetterReveal text="Studytrix" baseDelay={0.6} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: 1.2 }}
          className="mt-2 text-sm text-muted-foreground"
        >
          Your academic workspace
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.2 }}
          className="mt-5 flex items-center gap-2"
        >
          {[0, 1, 2].map((dotIndex) => (
            <motion.span
              key={dotIndex}
              className="size-2 rounded-full bg-primary"
              animate={{ y: [0, -8, 0], scale: [0.6, 1, 0.6] }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
                repeat: Infinity,
                delay: dotIndex * 0.2,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
