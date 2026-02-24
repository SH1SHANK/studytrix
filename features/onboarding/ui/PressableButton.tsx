"use client";

import type { ComponentProps } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PressableButtonProps = ComponentProps<typeof Button> & {
  wrapperClassName?: string;
  pressScale?: number;
};

export function PressableButton({
  className,
  wrapperClassName,
  pressScale = 0.965,
  ...props
}: PressableButtonProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileTap={
        shouldReduceMotion
          ? undefined
          : { scale: pressScale, y: 0.75 }
      }
      transition={{
        type: "spring",
        stiffness: 520,
        damping: 34,
        mass: 0.45,
      }}
      className={cn("inline-flex", wrapperClassName)}
    >
      <Button
        {...props}
        className={cn(
          "transition-transform duration-150 active:scale-[0.995]",
          className,
        )}
      />
    </motion.div>
  );
}
