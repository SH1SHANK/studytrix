"use client";

import Link from "next/link";
import { IconCheck } from "@tabler/icons-react";
import { motion } from "framer-motion";

import {
  SlideContainer,
  slideItemVariants,
} from "@/components/onboarding/shared/SlideContainer";
import { WordReveal } from "@/components/onboarding/shared/WordReveal";

type WelcomeConsentSlideProps = {
  ready: boolean;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
};

export function WelcomeConsentSlide({
  ready,
  accepted,
  onAcceptedChange,
}: WelcomeConsentSlideProps) {
  return (
    <SlideContainer ready={ready} className="flex flex-col">
      <div className="relative mx-auto flex h-full w-full max-w-4xl py-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[30px] bg-[linear-gradient(165deg,hsl(var(--primary)/0.11)_0%,hsl(var(--accent)/0.09)_42%,hsl(var(--background))_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 top-8 h-44 w-44 rounded-full bg-primary/18 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 bottom-14 h-52 w-52 rounded-full bg-primary/14 blur-3xl"
        />

        <div className="relative z-10 flex h-full w-full flex-col text-center">
          <div className="flex flex-1 items-center justify-center">
            <div className="space-y-3">
              <motion.h2
                variants={slideItemVariants}
                className="font-heading text-[clamp(2rem,5vw,3.2rem)] font-semibold leading-[1.02] tracking-tight text-foreground"
              >
                <WordReveal text="Welcome to Studytrix" start={ready} />
              </motion.h2>

              <motion.p variants={slideItemVariants} className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                Your local-first study workspace.
              </motion.p>
            </div>
          </div>

          <motion.article
            variants={slideItemVariants}
            className="mx-auto mt-auto w-full max-w-2xl rounded-2xl border border-border/70 bg-card/75 p-4"
          >
            <button
              type="button"
              onClick={() => onAcceptedChange(!accepted)}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border/70 bg-card/70 px-3 py-2.5 text-center transition-colors hover:bg-card"
            >
              <motion.span
                animate={accepted ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md border ${
                  accepted
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-transparent"
                }`}
              >
                <IconCheck className="size-3.5" />
              </motion.span>
              <span className="text-sm text-foreground/95">
                I accept the Terms of Service and Privacy Policy to continue onboarding.
              </span>
            </button>

            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              Review documents:
              {" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Terms of Service
              </Link>
              {" · "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Privacy Policy
              </Link>
            </p>
          </motion.article>
        </div>
      </div>
    </SlideContainer>
  );
}
