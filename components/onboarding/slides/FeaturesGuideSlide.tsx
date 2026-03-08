"use client";

import Link from "next/link";
import { IconArrowUpRight, IconBook2, IconFolders, IconSparkles, IconTarget } from "@tabler/icons-react";
import { motion } from "framer-motion";

import {
  AnimatedSlideIcon,
  SlideContainer,
  slideItemVariants,
} from "@/components/onboarding/shared/SlideContainer";
import { WordReveal } from "@/components/onboarding/shared/WordReveal";

type FeaturesGuideSlideProps = {
  ready: boolean;
};

export function FeaturesGuideSlide({ ready }: FeaturesGuideSlideProps) {
  return (
    <SlideContainer ready={ready} className="flex flex-col">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center gap-5 py-4">
        <motion.p
          variants={slideItemVariants}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Capabilities
        </motion.p>

        <motion.div variants={slideItemVariants}>
          <AnimatedSlideIcon
            start={ready}
            className="inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary"
          >
            <IconBook2 className="size-8" />
          </AnimatedSlideIcon>
        </motion.div>

        <motion.h2
          variants={slideItemVariants}
          className="font-heading text-[clamp(1.9rem,4.9vw,3.1rem)] font-semibold leading-tight tracking-tight text-foreground"
        >
          <WordReveal text="Explore the full feature map" start={ready} />
        </motion.h2>

        <motion.p variants={slideItemVariants} className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Want the complete breakdown of every workflow, module, and capability? Open the features
          guide anytime for detailed references.
        </motion.p>

        <motion.div variants={slideItemVariants} className="grid gap-2.5 sm:grid-cols-3">
          <article className="rounded-xl border border-border/70 bg-card/70 p-3">
            <IconSparkles className="size-4 text-primary" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Smart Search
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/85">
              Local semantic retrieval and contextual indexing behavior.
            </p>
          </article>
          <article className="rounded-xl border border-border/70 bg-card/70 p-3">
            <IconFolders className="size-4 text-primary" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Personal Repo
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/85">
              Capture, organize, and manage personal folders/files quickly.
            </p>
          </article>
          <article className="rounded-xl border border-border/70 bg-card/70 p-3">
            <IconTarget className="size-4 text-primary" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Operations
            </p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/85">
              Offline storage, sharing, downloads, and workflow safeguards.
            </p>
          </article>
        </motion.div>

        <motion.div variants={slideItemVariants}>
          <Link
            href="/features"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-primary/45 bg-primary/12 px-4 text-sm font-medium text-foreground transition-colors hover:bg-primary/20"
          >
            Visit Features Page
            <IconArrowUpRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </SlideContainer>
  );
}

