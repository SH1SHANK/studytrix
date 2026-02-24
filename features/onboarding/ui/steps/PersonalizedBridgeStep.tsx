"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { PressableButton } from "@/features/onboarding/ui/PressableButton";

type PersonalizedBridgeStepProps = {
  firstName: string;
  onBack: () => void;
  onContinue: () => void;
};

export function PersonalizedBridgeStep({
  firstName,
  onBack,
  onContinue,
}: PersonalizedBridgeStepProps) {
  const [ready, setReady] = useState(false);
  const greetingText = `Hey there, ${firstName}!`;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setReady(true), 650);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-4 pb-5 pt-4 text-center sm:px-8 sm:pb-8 sm:pt-8">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0.2 }}
        animate={{ opacity: 0.45 }}
      >
        <motion.div
          className="absolute -left-14 top-10 h-44 w-44 rounded-full bg-primary/25 blur-3xl"
          animate={{ x: [0, 20, -8, 0], y: [0, -12, 10, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-12 bottom-6 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl"
          animate={{ x: [0, -16, 8, 0], y: [0, 8, -8, 0] }}
          transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
        />
      </motion.div>

      <div className="relative z-10 max-w-xl space-y-4">
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground"
        >
          Nice to meet you
        </motion.p>
        <motion.h2
          aria-label={greetingText}
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.03,
                delayChildren: 0.08,
              },
            },
          }}
        >
          {greetingText.split("").map((char, index) => (
            <motion.span
              key={`${char}-${index}`}
              className="inline-block"
              variants={{
                hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)" },
              }}
              transition={{ duration: 0.28 }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          className="text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          Next, let&apos;s set your academic context so Studytrix opens with the right department and semester from the start.
        </motion.p>
      </div>

      <motion.div
        className="relative z-10 mt-8 flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.35 }}
      >
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
          disabled={!ready}
        >
          Continue Setup
        </PressableButton>
      </motion.div>
    </div>
  );
}
