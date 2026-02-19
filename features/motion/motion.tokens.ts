"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

import { useSettingsStore } from "@/features/settings/settings.store";

const DEFAULT_ANIMATION_INTENSITY = 60;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveAnimationIntensity(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return DEFAULT_ANIMATION_INTENSITY;
  }

  return clamp(Math.round(raw), 0, 100);
}

export function resolveMotionScale(intensity: number, reducedMotion: boolean): number {
  if (reducedMotion) {
    return 0;
  }

  const normalized = intensity / 100;
  return clamp(normalized, 0, 1);
}

export function getRuntimeMotionScale(): number {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return 0;
  }

  const raw = useSettingsStore.getState().values.animation_intensity;
  const intensity = resolveAnimationIntensity(raw);
  return resolveMotionScale(intensity, false);
}

export function useMotionTokens() {
  const reducedMotion = useReducedMotion();
  const rawIntensity = useSettingsStore((state) => state.values.animation_intensity);

  return useMemo(() => {
    const intensity = resolveAnimationIntensity(rawIntensity);
    const scale = resolveMotionScale(intensity, Boolean(reducedMotion));

    return {
      intensity,
      scale,
      spring: {
        stiffness: Math.round(280 + (140 * scale)),
        damping: Math.round(22 + (10 * (1 - scale))),
        mass: 0.75,
      },
      durations: {
        fast: 0.08 + (0.12 * scale),
        normal: 0.14 + (0.16 * scale),
        slow: 0.2 + (0.24 * scale),
      },
    };
  }, [rawIntensity, reducedMotion]);
}
