"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type LetterRevealProps = {
  text: string;
  className?: string;
  start?: boolean;
  stagger?: number;
  baseDelay?: number;
};

export function LetterReveal({
  text,
  className,
  start = true,
  stagger = 0.04,
  baseDelay = 0,
}: LetterRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn("inline-block", className)} aria-label={text}>
      {text.split("").map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          className="inline-block"
          initial={{ opacity: 0, y: 8 }}
          animate={start ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{
            duration: 0.24,
            delay: baseDelay + (index * stagger),
            ease: "easeOut",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}
