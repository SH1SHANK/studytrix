"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Mic, PenSquare, Plus } from "lucide-react";

import { useCommandCenterStore } from "@/features/command/command-center.store";

type CaptureMode = "photo" | "note" | "voice";

type QuickCaptureFABProps = {
  onOpen: (mode?: CaptureMode) => void;
};

function triggerHaptic(duration = 12): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

export function QuickCaptureFAB({ onOpen }: QuickCaptureFABProps) {
  const isCommandCenterOpen = useCommandCenterStore((state) => state.isOpen);
  const [showQuickModes, setShowQuickModes] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);

  if (isCommandCenterOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] right-5 z-40">
      <AnimatePresence>
        {showQuickModes ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-3 flex flex-col items-end gap-2"
          >
            {([
              { key: "photo", label: "Photo", icon: Camera },
              { key: "note", label: "Note", icon: PenSquare },
              { key: "voice", label: "Voice", icon: Mic },
            ] as const).map((entry, index) => (
              <motion.button
                key={entry.key}
                type="button"
                initial={{ opacity: 0, x: 8, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.96 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => {
                  setShowQuickModes(false);
                  onOpen(entry.key);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-medium shadow-md"
              >
                <entry.icon className="size-4" />
                {entry.label}
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        onPointerDown={() => {
          if (longPressTimerRef.current !== null) {
            window.clearTimeout(longPressTimerRef.current);
          }
          longPressTimerRef.current = window.setTimeout(() => {
            triggerHaptic(15);
            setShowQuickModes(true);
          }, 500);
        }}
        onPointerUp={() => {
          if (longPressTimerRef.current !== null) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }}
        onPointerLeave={() => {
          if (longPressTimerRef.current !== null) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }}
        onClick={() => {
          setShowQuickModes(false);
          onOpen();
        }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 540, damping: 30, duration: 0.08 }}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_4px_16px_hsl(var(--primary)/0.35)]"
        style={{ background: "hsl(var(--primary))" }}
        aria-label="Quick capture"
      >
        <Plus className="size-6" />
      </motion.button>
    </div>
  );
}

