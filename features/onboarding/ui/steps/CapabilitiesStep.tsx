"use client";

import { useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

import { ONBOARDING_CAPABILITY_CARDS } from "@/features/onboarding/onboarding.content";
import { PressableButton } from "@/features/onboarding/ui/PressableButton";
import { cn } from "@/lib/utils";

type CapabilitiesStepProps = {
  onContinue: () => void;
};

const SWIPE_THRESHOLD_PX = 70;
const SWIPE_VELOCITY_THRESHOLD = 640;

export function CapabilitiesStep({ onContinue }: CapabilitiesStepProps) {
  const shouldReduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const cards = ONBOARDING_CAPABILITY_CARDS;
  const activeCard = cards[activeIndex];
  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-180, 0, 180], [-6, 0, 6]);
  const translateY = useTransform(dragX, [-180, 0, 180], [-10, 0, -10]);

  const title = useMemo(
    () => `Capability ${activeIndex + 1} of ${cards.length}`,
    [activeIndex, cards.length],
  );
  const completionPercent = useMemo(
    () => ((activeIndex + 1) / cards.length) * 100,
    [activeIndex, cards.length],
  );

  const moveTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= cards.length) {
      return;
    }

    dragX.set(0);
    setDirection(nextIndex > activeIndex ? 1 : -1);
    setActiveIndex(nextIndex);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const velocityStrength = Math.min(44, Math.abs(velocityX) / 30);
    const dynamicThreshold = Math.max(24, SWIPE_THRESHOLD_PX - velocityStrength);
    const shouldAdvanceByVelocity = velocityX <= -SWIPE_VELOCITY_THRESHOLD;
    const shouldRetreatByVelocity = velocityX >= SWIPE_VELOCITY_THRESHOLD;

    if (offsetX <= -dynamicThreshold || shouldAdvanceByVelocity) {
      moveTo(activeIndex + 1);
      return;
    }

    if (offsetX >= dynamicThreshold || shouldRetreatByVelocity) {
      moveTo(activeIndex - 1);
    }
  };

  return (
    <div className="flex h-full flex-col gap-5 px-4 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Studytrix Capabilities
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Explore what you can do here
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Swipe through the core workflows. Every capability stays configurable so you can keep the app aligned with your study style.
        </p>
        <div className="max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-4 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_48%)]" />
        <div className="relative h-full">
          <motion.div
            aria-hidden
            className="absolute inset-4 rounded-2xl border border-border/35 bg-background/40"
            animate={{ scale: 0.95, y: 16, opacity: 0.34 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.22 }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-3 rounded-2xl border border-border/50 bg-background/55"
            animate={{ scale: 0.975, y: 8, opacity: 0.5 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.24 }}
          />
          <AnimatePresence custom={direction} mode="wait">
            <motion.article
              key={activeCard.id}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 96 : -96, scale: 0.965, rotateY: direction > 0 ? 7 : -7 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -90 : 90, scale: 0.97, rotateY: direction > 0 ? -5 : 5 }}
              transition={{
                type: shouldReduceMotion ? "tween" : "spring",
                stiffness: 310,
                damping: 32,
                mass: 0.74,
                duration: shouldReduceMotion ? 0.12 : undefined,
              }}
              drag="x"
              style={shouldReduceMotion ? undefined : { x: dragX, rotateZ: rotate, y: translateY }}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              onDragEnd={handleDragEnd}
              className="relative z-10 flex h-full cursor-grab flex-col rounded-2xl border border-border/70 bg-background/80 p-5 active:cursor-grabbing"
              aria-label={title}
            >
              <motion.span
                className="absolute right-4 top-4 rounded-full border border-border/60 bg-muted/70 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeIndex + 1}/{cards.length}
              </motion.span>
              <div
                className={cn(
                  "mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br",
                  activeCard.accentClassName,
                )}
              >
                <motion.div
                  key={activeCard.id}
                  initial={{ rotate: -10, scale: 0.86, opacity: 0.45 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: shouldReduceMotion ? 0.12 : 0.3 }}
                >
                  <activeCard.icon className="size-6" />
                </motion.div>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {activeCard.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {activeCard.description}
              </p>
              <div className="mt-4 rounded-xl border border-border/70 bg-muted/50 px-3 py-2">
                <p className="text-xs font-medium leading-relaxed text-foreground/85">
                  {activeCard.controlHint}
                </p>
              </div>
              <div className="mt-auto pt-5">
                <p className="text-xs text-muted-foreground">
                  Swipe left or right. Use the controls below if you prefer tapping.
                </p>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {cards.map((card, index) => (
            <button
              key={card.id}
              type="button"
              onClick={() => moveTo(index)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                index === activeIndex ? "w-6 bg-primary" : "w-2.5 bg-border hover:bg-border/80",
              )}
              aria-label={`Go to capability ${index + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <PressableButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => moveTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            className="rounded-xl"
          >
            Previous
          </PressableButton>
          {activeIndex < cards.length - 1 ? (
            <PressableButton
              type="button"
              size="sm"
              onClick={() => moveTo(activeIndex + 1)}
              className="rounded-xl"
            >
              Next
            </PressableButton>
          ) : (
            <PressableButton
              type="button"
              size="sm"
              onClick={onContinue}
              className="rounded-xl"
            >
              Continue
            </PressableButton>
          )}
        </div>
      </div>
    </div>
  );
}
