"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import {
  AnimatedSlideIcon,
  SlideContainer,
  slideItemVariants,
} from "@/components/onboarding/shared/SlideContainer";
import { LetterReveal } from "@/components/onboarding/shared/LetterReveal";
import { WordReveal } from "@/components/onboarding/shared/WordReveal";
import { cn } from "@/lib/utils";

type CapabilitiesSlideProps = {
  ready: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  hintTitle?: string;
  hint: string;
  icon: ReactNode;
  accentClassName?: string;
};

export function CapabilitiesSlide({
  ready,
  eyebrow,
  title,
  subtitle,
  hintTitle = "Control Hint",
  hint,
  icon,
  accentClassName,
}: CapabilitiesSlideProps) {
  return (
    <SlideContainer ready={ready} className="flex flex-col">
      <div className="mx-auto flex h-full w-full max-w-4xl items-center py-4">
        <div className="w-full space-y-5">
          <motion.p
            variants={slideItemVariants}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
          >
            {eyebrow}
          </motion.p>

          <motion.div variants={slideItemVariants}>
            <AnimatedSlideIcon
              start={ready}
              className={cn(
                "inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-foreground",
                accentClassName,
              )}
            >
              {icon}
            </AnimatedSlideIcon>
          </motion.div>

          <motion.h2
            variants={slideItemVariants}
            className="font-heading text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.04] tracking-tight text-foreground"
          >
            <WordReveal text={title} start={ready} />
          </motion.h2>

          <motion.p variants={slideItemVariants} className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            {subtitle.length < 40 ? (
              <LetterReveal text={subtitle} start={ready} />
            ) : (
              subtitle
            )}
          </motion.p>

          <motion.article
            variants={slideItemVariants}
            className="max-w-2xl rounded-2xl border border-border/70 bg-card/75 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {hintTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/95">{hint}</p>
          </motion.article>
        </div>
      </div>
    </SlideContainer>
  );
}
