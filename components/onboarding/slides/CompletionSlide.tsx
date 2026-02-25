"use client";

import { IconCheck } from "@tabler/icons-react";
import { motion } from "framer-motion";

import {
  AnimatedSlideIcon,
  SlideContainer,
  slideItemVariants,
} from "@/components/onboarding/shared/SlideContainer";
import { WordReveal } from "@/components/onboarding/shared/WordReveal";

type CompletionSlideProps = {
  ready: boolean;
  name: string;
};

export function CompletionSlide({ ready, name }: CompletionSlideProps) {
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const headline = firstName ? `You're all set, ${firstName}.` : "You're all set.";

  return (
    <SlideContainer ready={ready} className="flex flex-col">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center gap-5 py-6 text-center">
        <motion.p
          variants={slideItemVariants}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Completion
        </motion.p>

        <motion.div variants={slideItemVariants}>
          <AnimatedSlideIcon start={ready} className="inline-flex size-16 items-center justify-center rounded-2xl border border-border bg-primary/10 text-primary">
            <IconCheck className="size-8" />
          </AnimatedSlideIcon>
        </motion.div>

        <motion.h2
          variants={slideItemVariants}
          className="font-heading text-[clamp(2rem,5vw,3.2rem)] font-semibold tracking-tight text-foreground"
        >
          <WordReveal text={headline} start={ready} />
        </motion.h2>

        <motion.p variants={slideItemVariants} className="max-w-lg text-sm text-muted-foreground">
          Tap Get Started to open your dashboard with your selected onboarding preferences.
        </motion.p>
      </div>
    </SlideContainer>
  );
}
