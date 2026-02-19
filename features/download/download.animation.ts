"use client";

import { getRuntimeMotionScale } from "@/features/motion/motion.tokens";

import { emit } from "./download.events";

const MIN_DURATION_MS = 400;
const MAX_DURATION_MS = 600;

function clampDuration(distance: number): number {
  const scale = getRuntimeMotionScale();
  if (scale <= 0) {
    return 0;
  }

  const normalized = Math.min(1, Math.max(0, distance / 1200));
  const duration = (MIN_DURATION_MS + (MAX_DURATION_MS - MIN_DURATION_MS) * normalized) * scale;
  return Math.round(duration);
}

export function animateToDownloadButton(
  sourceElement: HTMLElement,
  targetElement: HTMLElement,
): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const sourceRect = sourceElement.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();

  if (sourceRect.width <= 0 || sourceRect.height <= 0) {
    return;
  }

  const clone = sourceElement.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    return;
  }

  const dx = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
  const dy = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
  const distance = Math.hypot(dx, dy);
  const durationMs = clampDuration(distance);
  if (durationMs <= 0) {
    emit("download:animation-complete", { durationMs: 0 });
    return;
  }

  clone.setAttribute("aria-hidden", "true");
  clone.style.position = "fixed";
  clone.style.left = `${sourceRect.left}px`;
  clone.style.top = `${sourceRect.top}px`;
  clone.style.width = `${sourceRect.width}px`;
  clone.style.height = `${sourceRect.height}px`;
  clone.style.margin = "0";
  clone.style.pointerEvents = "none";
  clone.style.transform = "translate3d(0, 0, 0) scale(1)";
  clone.style.transformOrigin = "center center";
  clone.style.opacity = "1";
  clone.style.zIndex = "9999";
  clone.style.willChange = "transform, opacity";
  clone.style.transition = `transform ${durationMs}ms cubic-bezier(0.22, 0.8, 0.2, 1), opacity ${durationMs}ms ease`;

  document.body.appendChild(clone);

  const cleanup = () => {
    if (clone.isConnected) {
      clone.remove();
    }

    emit("download:animation-complete", { durationMs });
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      clone.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.35)`;
      clone.style.opacity = "0.2";
    });
  });

  window.setTimeout(cleanup, durationMs + 24);
}
