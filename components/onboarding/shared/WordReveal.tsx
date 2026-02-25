"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type WordRevealProps = {
  text: string;
  className?: string;
  start?: boolean;
  stagger?: number;
};

export function WordReveal({
  text,
  className,
  start = true,
  stagger = 0.06,
}: WordRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.trim().split(/\s+/);

  if (shouldReduceMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn("inline-block", className)} aria-label={text}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="mr-[0.35ch] inline-block"
          initial={{ opacity: 0, y: 12 }}
          animate={start ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{
            duration: 0.34,
            delay: index * stagger,
            ease: "easeOut",
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
