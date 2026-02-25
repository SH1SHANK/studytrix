"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

type AnimatedInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  inputMode?: "text" | "email";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: "on" | "off";
  placeholder?: string;
  error?: string | null;
  successTick?: number;
  required?: boolean;
  className?: string;
};

export function AnimatedInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoCapitalize,
  autoCorrect,
  placeholder = "",
  error,
  successTick = 0,
  required = false,
  className,
}: AnimatedInputProps) {
  const [focused, setFocused] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isActive = focused || value.trim().length > 0;
  const hasError = Boolean(error);

  useEffect(() => {
    if (successTick <= 0) {
      return;
    }

    setShowSuccess(true);
    const timeoutId = window.setTimeout(() => setShowSuccess(false), 800);
    return () => window.clearTimeout(timeoutId);
  }, [successTick]);

  const shakeAnimation = useMemo(() => (hasError ? [0, -6, 6, -4, 4, 0] : 0), [hasError]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <motion.div
        animate={{ x: shakeAnimation }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative pt-2"
      >
        <motion.label
          htmlFor={id}
          className="pointer-events-none absolute left-3.5 top-[1.1rem] z-10 origin-left text-sm"
          animate={
            isActive
              ? { y: -14, scale: 0.84 }
              : { y: 0, scale: 1 }
          }
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          style={{
            color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          }}
        >
          {label}{required ? " *" : ""}
        </motion.label>

        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode={inputMode}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          placeholder={isActive ? placeholder : ""}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={hasError}
          className={cn(
            "h-[52px] w-full rounded-xl border bg-card/80 px-3.5 pb-2 pt-5 text-sm text-foreground outline-none",
            "transition-[border-color,box-shadow] duration-200 ease-in-out",
            "border-input",
            "focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
            hasError && "border-destructive focus:border-destructive focus:shadow-[0_0_0_3px_hsl(var(--destructive)/0.15)]",
            showSuccess ? "pr-10" : "",
          )}
          required={required}
        />

        <AnimatePresence>
          {showSuccess ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary"
            >
              <IconCheck className="size-4" stroke={2.5} />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key={error}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="text-xs text-destructive"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
