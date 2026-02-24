"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { PERSONAL_REPOSITORY_SWATCHES } from "@/features/custom-folders/custom-folders.constants";
import { cn } from "@/lib/utils";

type ColourSwatchPickerProps = {
  value: string;
  onChange: (next: string) => void;
};

export function ColourSwatchPicker({ value, onChange }: ColourSwatchPickerProps) {
  return (
    <div className="flex items-center gap-2">
      {PERSONAL_REPOSITORY_SWATCHES.map((swatch) => {
        const isActive = value === swatch.value;
        return (
          <button
            key={swatch.id}
            type="button"
            className={cn(
              "relative flex size-8 items-center justify-center rounded-full border border-border/70 transition-all duration-200",
              isActive ? "ring-2 ring-primary/35" : "hover:border-primary/45",
            )}
            style={{
              background: swatch.value,
              transform: isActive ? "scale(1.15)" : "scale(1)",
            }}
            aria-label={`Choose ${swatch.label}`}
            aria-pressed={isActive}
            onClick={() => onChange(swatch.value)}
          >
            {isActive ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center rounded-full bg-background/85 p-0.5 text-foreground"
              >
                <Check className="size-3" />
              </motion.span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
