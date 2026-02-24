"use client";

import { useState } from "react";
import { IconLock } from "@tabler/icons-react";
import { motion, useReducedMotion } from "framer-motion";

import { Input } from "@/components/ui/input";
import { PressableButton } from "@/features/onboarding/ui/PressableButton";

type IdentityStepProps = {
  name: string;
  email: string;
  nameError: string | null;
  emailError: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function IdentityStep({
  name,
  email,
  nameError,
  emailError,
  onNameChange,
  onEmailChange,
  onBack,
  onContinue,
}: IdentityStepProps) {
  const shouldReduceMotion = useReducedMotion();
  const containerVariants = shouldReduceMotion
    ? undefined
    : {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.08,
          delayChildren: 0.04,
        },
      },
    };
  const itemVariants = shouldReduceMotion
    ? undefined
    : {
      hidden: { opacity: 0, y: 10 },
      show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    };
  const [focusedField, setFocusedField] = useState<"name" | "email" | null>(null);

  return (
    <motion.div
      variants={containerVariants}
      initial={shouldReduceMotion ? undefined : "hidden"}
      animate={shouldReduceMotion ? undefined : "show"}
      className="flex h-full flex-col gap-5 px-4 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-6"
    >
      <motion.div variants={itemVariants} className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Personalization
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          What should we call you?
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Add your details for a more personal dashboard and context-aware setup.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-5 sm:p-6">
        <div className="space-y-1.5">
          <label
            htmlFor="onboarding-name"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Name
          </label>
          <div className="relative">
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl bg-primary/15 blur-md"
              initial={false}
              animate={{ opacity: focusedField === "name" ? 1 : 0, scale: focusedField === "name" ? 1.01 : 0.985 }}
              transition={{ duration: shouldReduceMotion ? 0.08 : 0.16 }}
            />
            <Input
              id="onboarding-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Your name"
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              className="relative h-11 rounded-xl bg-background/85 focus-visible:border-primary/55 focus-visible:ring-0"
            />
          </div>
          {nameError ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{nameError}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="onboarding-email"
            className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            Email
          </label>
          <div className="relative">
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl bg-primary/15 blur-md"
              initial={false}
              animate={{ opacity: focusedField === "email" ? 1 : 0, scale: focusedField === "email" ? 1.01 : 0.985 }}
              transition={{ duration: shouldReduceMotion ? 0.08 : 0.16 }}
            />
            <Input
              id="onboarding-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@example.com"
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              className="relative h-11 rounded-xl bg-background/85 focus-visible:border-primary/55 focus-visible:ring-0"
            />
          </div>
          {emailError ? (
            <p className="text-xs text-rose-600 dark:text-rose-400">{emailError}</p>
          ) : null}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-2xl border border-border/60 bg-muted/40 px-3 py-2.5">
        <p className="inline-flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <IconLock className="mt-0.5 size-3.5 shrink-0 text-foreground/70" />
          This information stays on this device for personalization only. It is not sent to or shared with any server.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-auto flex items-center justify-between gap-2">
        <PressableButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="rounded-xl"
        >
          Back
        </PressableButton>
        <PressableButton
          type="button"
          size="sm"
          onClick={onContinue}
          className="rounded-xl"
        >
          Continue
        </PressableButton>
      </motion.div>
    </motion.div>
  );
}
