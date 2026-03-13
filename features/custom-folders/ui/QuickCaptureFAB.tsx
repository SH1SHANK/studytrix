"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Mic, PenSquare, Plus } from "lucide-react";

import { useCommandCenterStore } from "@/features/command/command-center.store";

type CaptureMode = "photo" | "note" | "voice";

type QuickCaptureFABProps = {
  onOpen: (mode?: CaptureMode) => void;
};

// Static definition hoisted outside component to avoid re-creation on render
const CAPTURE_MODES = [
  {
    key: "photo" as CaptureMode,
    label: "Photo",
    description: "Camera shot",
    Icon: Camera,
    iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    borderClass: "border-sky-500/25 hover:border-sky-500/45",
    bgClass: "hover:bg-sky-500/5",
  },
  {
    key: "note" as CaptureMode,
    label: "Note",
    description: "Quick text note",
    Icon: PenSquare,
    iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-500/25 hover:border-emerald-500/45",
    bgClass: "hover:bg-emerald-500/5",
  },
  {
    key: "voice" as CaptureMode,
    label: "Voice",
    description: "Record audio",
    Icon: Mic,
    iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    borderClass: "border-violet-500/25 hover:border-violet-500/45",
    bgClass: "hover:bg-violet-500/5",
  },
] as const;

function triggerHaptic(duration = 10): void {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  ) {
    navigator.vibrate(duration);
  }
}

export function QuickCaptureFAB({ onOpen }: QuickCaptureFABProps) {
  const isCommandCenterOpen = useCommandCenterStore((state) => state.isOpen);
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = useCallback(() => {
    triggerHaptic(8);
    setIsExpanded((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (mode: CaptureMode) => {
      triggerHaptic(12);
      setIsExpanded(false);
      onOpen(mode);
    },
    [onOpen],
  );

  const handleBackdrop = useCallback(() => {
    setIsExpanded(false);
  }, []);

  if (isCommandCenterOpen || !mounted) {
    return null;
  }

  return createPortal(
    <>
      {/* Transparent backdrop — click outside to dismiss */}
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="fixed inset-0 z-40"
            onClick={handleBackdrop}
          />
        ) : null}
      </AnimatePresence>

      {/* FAB stack: sub-actions above the main button */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] right-4 z-50 flex flex-col items-end gap-2.5 sm:right-5 lg:right-8">
        {/* Sub-action cards */}
        <AnimatePresence>
          {isExpanded ? (
            <motion.div
              key="fab-menu"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="flex flex-col items-end gap-2"
              role="menu"
              aria-label="Capture modes"
            >
              {CAPTURE_MODES.map((entry, index) => (
                <motion.button
                  key={entry.key}
                  type="button"
                  role="menuitem"
                  initial={{ opacity: 0, x: 18, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 14, scale: 0.92 }}
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 26,
                    delay: index * 0.06,
                  }}
                  onClick={() => handleSelect(entry.key)}
                  className={`flex items-center gap-3 rounded-2xl border bg-card/95 px-3 py-2.5 shadow-[0_4px_18px_hsl(var(--background)/0.42)] backdrop-blur-lg transition-all active:scale-[0.97] ${entry.borderClass} ${entry.bgClass}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${entry.iconClass}`}
                  >
                    <entry.Icon className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground">
                      {entry.label}
                    </p>
                    <p className="text-[11px] leading-tight text-muted-foreground">
                      {entry.description}
                    </p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Main FAB — pill shape with rotating Plus icon */}
        <motion.button
          type="button"
          onClick={handleToggle}
          whileTap={{ scale: 0.91 }}
          transition={{ type: "spring", stiffness: 520, damping: 28 }}
          className={`relative inline-flex h-12 items-center gap-2 rounded-full border px-4 shadow-[0_6px_20px_hsl(var(--background)/0.48)] backdrop-blur-sm transition-colors ${
            isExpanded
              ? "border-border/70 bg-card text-foreground"
              : "border-primary/35 text-foreground"
          }`}
          style={
            isExpanded
              ? undefined
              : {
                  background:
                    "radial-gradient(70% 70% at 28% 26%, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.10) 42%, transparent 100%), linear-gradient(160deg, hsl(var(--card) / 0.95) 0%, hsl(var(--card) / 0.88) 100%)",
                }
          }
          aria-label={isExpanded ? "Close quick capture" : "Quick capture"}
          aria-expanded={isExpanded}
          aria-haspopup="menu"
        >
          {/* Subtle inner highlight ring (collapsed only) */}
          {!isExpanded ? (
            <span className="pointer-events-none absolute inset-0.5 rounded-full border border-primary/18" />
          ) : null}

          {/* Plus rotates 45° → becomes × */}
          <motion.span
            animate={{ rotate: isExpanded ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="flex shrink-0 items-center justify-center"
          >
            <Plus className="size-4 stroke-[2.4]" />
          </motion.span>

          <span className="text-sm font-semibold">
            {isExpanded ? "Close" : "Capture"}
          </span>
        </motion.button>
      </div>
    </>,
    document.body,
  );
}
