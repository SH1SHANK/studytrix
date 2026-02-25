"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";

export const slideContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

export const slideItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 28,
    },
  },
};

type SlideContainerProps = {
  ready: boolean;
  scrollable?: boolean;
  className?: string;
  children: ReactNode;
};

export function SlideContainer({
  ready,
  scrollable = false,
  className,
  children,
}: SlideContainerProps) {
  return (
    <motion.div
      variants={slideContainerVariants}
      initial="hidden"
      animate={ready ? "show" : "hidden"}
      className={cn(
        "h-full w-full px-5 sm:px-8",
        scrollable ? "overflow-y-auto" : "overflow-hidden",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

type AnimatedSlideIconProps = {
  className?: string;
  children: ReactNode;
  start?: boolean;
};

export function AnimatedSlideIcon({ className, children, start = true }: AnimatedSlideIconProps) {
  return (
    <motion.div
      className={className}
      initial={{ scale: 0.6, rotate: 0 }}
      animate={start ? { scale: 1, rotate: [0, -8, 4, 0] } : { scale: 0.6, rotate: 0 }}
      transition={{
        scale: {
          type: "spring",
          stiffness: 500,
          damping: 20,
        },
        rotate: {
          duration: 0.5,
          ease: "easeOut",
        },
      }}
    >
      {children}
    </motion.div>
  );
}
