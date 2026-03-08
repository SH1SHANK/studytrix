"use client";

import { IconLock, IconUserCircle } from "@tabler/icons-react";
import { motion } from "framer-motion";

import { AnimatedInput } from "@/components/onboarding/shared/AnimatedInput";
import {
  AnimatedSlideIcon,
  SlideContainer,
  slideItemVariants,
} from "@/components/onboarding/shared/SlideContainer";
import { WordReveal } from "@/components/onboarding/shared/WordReveal";

type IdentitySlideProps = {
  ready: boolean;
  name: string;
  email: string;
  nameError: string | null;
  emailError: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  nameSuccessTick: number;
  emailSuccessTick: number;
};

export function IdentitySlide({
  ready,
  name,
  email,
  nameError,
  emailError,
  onNameChange,
  onEmailChange,
  nameSuccessTick,
  emailSuccessTick,
}: IdentitySlideProps) {
  return (
    <SlideContainer ready={ready} className="flex flex-col">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center gap-5 py-4">
        <motion.p
          variants={slideItemVariants}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Personalization
        </motion.p>

        <motion.div variants={slideItemVariants}>
          <AnimatedSlideIcon start={ready} className="inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
            <IconUserCircle className="size-8" />
          </AnimatedSlideIcon>
        </motion.div>

        <motion.h2
          variants={slideItemVariants}
          className="font-heading text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-tight tracking-tight text-foreground"
        >
          <WordReveal text="What should we call you?" start={ready} />
        </motion.h2>

        <motion.p variants={slideItemVariants} className="max-w-2xl text-sm text-muted-foreground">
          Add your details for personalized greetings and a smoother setup experience.
        </motion.p>

        <motion.div variants={slideItemVariants} className="space-y-4 rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-5">
          <AnimatedInput
            id="onboarding-name"
            label="Name"
            value={name}
            onChange={onNameChange}
            placeholder="Your name"
            error={nameError}
            successTick={nameSuccessTick}
            required
          />
          <AnimatedInput
            id="onboarding-email"
            label="Email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            value={email}
            onChange={onEmailChange}
            placeholder="you@example.com"
            error={emailError}
            successTick={emailSuccessTick}
            required
          />
        </motion.div>

        <motion.p
          variants={slideItemVariants}
          className="inline-flex items-start gap-2 rounded-2xl border border-border/70 bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
        >
          <IconLock className="mt-0.5 size-3.5 shrink-0 text-foreground/75" />
          This information stays on this device for personalization only.
        </motion.p>
      </div>
    </SlideContainer>
  );
}
