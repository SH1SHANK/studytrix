"use client";

import { useCallback, useRef } from "react";

type LongPressOptions = {
  /** Delay in ms before the long press fires. Default 500. */
  delay?: number;
  /** Called when the long press timer starts (pointer down). */
  onStart?: () => void;
  /** Called when the press is cancelled before the delay. */
  onCancel?: () => void;
};

type LongPressHandlers = {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onContextMenu: (event: React.SyntheticEvent) => void;
};

function triggerHaptic(duration = 12): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(duration);
  }
}

/**
 * Custom hook for long-press gestures.
 * Returns pointer handlers to spread onto an element.
 *
 * @param callback - Fired when a successful long press completes.
 * @param options  - Delay, onStart, onCancel callbacks.
 */
export function useLongPress(
  callback: () => void,
  options: LongPressOptions = {},
): LongPressHandlers {
  const { delay = 500, onStart, onCancel } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (_event: React.PointerEvent) => {
      firedRef.current = false;
      onStart?.();

      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        triggerHaptic();
        callback();
      }, delay);
    },
    [callback, delay, onStart],
  );

  const handlePointerUp = useCallback(() => {
    if (!firedRef.current) {
      onCancel?.();
    }
    clear();
  }, [clear, onCancel]);

  const handlePointerLeave = useCallback(() => {
    if (!firedRef.current) {
      onCancel?.();
    }
    clear();
  }, [clear, onCancel]);

  const handleContextMenu = useCallback((event: React.SyntheticEvent) => {
    // Prevent native context menu on mobile long-press
    event.preventDefault();
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handlePointerLeave,
    onContextMenu: handleContextMenu,
  };
}
