"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: string;
};

type AnimatedSelectProps = {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  successTick?: number;
  className?: string;
};

export function AnimatedSelect({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  error,
  successTick = 0,
  className,
}: AnimatedSelectProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const hasError = Boolean(error);
  const isActive = focused || value.length > 0;
  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label ?? "",
    [options, value],
  );

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

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
        ref={containerRef}
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
          {label}
        </motion.label>

        <button
          id={id}
          ref={triggerRef}
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
            setFocused(true);
          }}
          className={cn(
            "flex h-[52px] w-full items-center justify-between rounded-xl border bg-card/80 px-3.5 pb-2 pt-5 text-sm text-foreground outline-none",
            "transition-[border-color,box-shadow] duration-200 ease-in-out",
            "border-input",
            "focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
            hasError && "border-destructive focus:border-destructive focus:shadow-[0_0_0_3px_hsl(var(--destructive)/0.15)]",
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={cn(selectedLabel ? "text-foreground" : "text-muted-foreground")}>
            {selectedLabel || placeholder}
          </span>
          <span className="inline-flex items-center gap-1">
            <AnimatePresence>
              {showSuccess ? (
                <motion.span
                  key="select-success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="text-primary"
                >
                  <IconCheck className="size-4" stroke={2.5} />
                </motion.span>
              ) : null}
            </AnimatePresence>
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
              <IconChevronDown className="size-4 text-muted-foreground" />
            </motion.span>
          </span>
        </button>

        <AnimatePresence>
          {open ? (
            <motion.ul
              role="listbox"
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height: "auto",
                opacity: 1,
                transition: {
                  height: { duration: 0.2, ease: "easeOut" },
                  opacity: { duration: 0.18, ease: "easeOut" },
                  staggerChildren: 0.04,
                },
              }}
              exit={{
                height: 0,
                opacity: 0,
                transition: {
                  duration: 0.15,
                  ease: "easeOut",
                },
              }}
              className="absolute left-0 top-[calc(100%+0.35rem)] z-30 w-full overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg"
            >
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <motion.li
                    key={option.value}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -2 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/60",
                      )}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setFocused(false);
                        triggerRef.current?.focus();
                      }}
                    >
                      <span>{option.label}</span>
                      {active ? <IconCheck className="size-3.5 text-primary" stroke={2.5} /> : null}
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
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
