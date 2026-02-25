"use client";

import Link from "next/link";
import { IconFolderHeart, IconInfoCircle } from "@tabler/icons-react";
import { motion } from "framer-motion";

import {
  AnimatedSlideIcon,
  SlideContainer,
  slideItemVariants,
} from "@/components/onboarding/shared/SlideContainer";
import { WordReveal } from "@/components/onboarding/shared/WordReveal";
import { Switch } from "@/components/ui/switch";

type PersonalSlideProps = {
  ready: boolean;
  personalRepositoryEnabled: boolean;
  onPersonalRepositoryChange: (value: boolean) => void;
};

export function PersonalSlide({
  ready,
  personalRepositoryEnabled,
  onPersonalRepositoryChange,
}: PersonalSlideProps) {
  return (
    <SlideContainer ready={ready} className="flex flex-col">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center gap-5 py-4">
        <motion.p
          variants={slideItemVariants}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Personal
        </motion.p>

        <motion.div variants={slideItemVariants}>
          <AnimatedSlideIcon start={ready} className="inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
            <IconFolderHeart className="size-7" />
          </AnimatedSlideIcon>
        </motion.div>

        <motion.h2
          variants={slideItemVariants}
          className="font-heading text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-tight tracking-tight text-foreground"
        >
          <WordReveal text="Personal workspace settings" start={ready} />
        </motion.h2>

        <motion.article variants={slideItemVariants} className="space-y-4 rounded-2xl border border-border/70 bg-card/75 p-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <IconFolderHeart className="size-4 text-primary" />
                Personal Repository
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Keep your private notes and custom folders in a separate space.
              </p>
            </div>
            <Switch
              checked={personalRepositoryEnabled}
              onCheckedChange={onPersonalRepositoryChange}
              aria-label="Enable Personal Repository"
            />
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <IconInfoCircle className="size-4 text-primary" />
              Helpful to know
            </p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
              <li>Your repository is stored locally on this device.</li>
              <li>Keep your own backups for important files.</li>
              <li>Storage behavior can vary in private/incognito sessions.</li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              See <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">Terms</Link> and <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">Privacy</Link>.
            </p>
          </div>
        </motion.article>
      </div>
    </SlideContainer>
  );
}
