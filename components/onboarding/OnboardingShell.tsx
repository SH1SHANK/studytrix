"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { cn } from "@/lib/utils";

type OnboardingShellProps = {
  slideKey: string;
  direction: 1 | -1;
  renderSlide: (ready: boolean) => ReactNode;
  allowVerticalScroll?: boolean;
  currentStep: number;
  totalSteps: number;
  onStepPress: (stepIndex: number) => void;
  onNext: () => void;
  onPrev: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  showNavigation?: boolean;
  showBack?: boolean;
  isLastStep?: boolean;
};

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

function isInputLikeElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tag = element.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") {
    return true;
  }

  return element.isContentEditable;
}

export function OnboardingShell({
  slideKey,
  direction,
  renderSlide,
  allowVerticalScroll = false,
  currentStep,
  totalSteps,
  onStepPress,
  onNext,
  onPrev,
  nextDisabled = false,
  nextLabel = "Continue",
  showNavigation = true,
  showBack = true,
  isLastStep = false,
}: OnboardingShellProps) {
  const [contentReady, setContentReady] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    setContentReady(false);
    const timeoutId = window.setTimeout(() => {
      setContentReady(true);
    }, 240);

    return () => window.clearTimeout(timeoutId);
  }, [slideKey]);

  useEffect(() => {
    const updateFocusedState = () => {
      setInputFocused(isInputLikeElement(document.activeElement));
    };

    updateFocusedState();
    document.addEventListener("focusin", updateFocusedState);
    document.addEventListener("focusout", updateFocusedState);

    return () => {
      document.removeEventListener("focusin", updateFocusedState);
      document.removeEventListener("focusout", updateFocusedState);
    };
  }, []);

  const dragMode = useMemo(() => (inputFocused ? false : "x"), [inputFocused]);

  const handleNext = useCallback(() => {
    if (nextDisabled) {
      return;
    }

    if (!isLastStep) {
      onNext();
      return;
    }

    setCelebrate(true);
    window.setTimeout(() => {
      setCelebrate(false);
      onNext();
    }, 160);
  }, [isLastStep, nextDisabled, onNext]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <header className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+16px)] z-40 px-5 sm:px-8">
        <div className="pointer-events-auto mx-auto w-full max-w-4xl">
          <OnboardingStepper
            currentStep={currentStep}
            totalSteps={totalSteps}
            onStepPress={onStepPress}
          />
        </div>
      </header>

      <main className="relative h-full w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slideKey}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            drag={dragMode}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) {
                handleNext();
              }
              if (info.offset.x > 80) {
                onPrev();
              }
            }}
            onAnimationComplete={(definition) => {
              if (definition === "center") {
                setContentReady(true);
              }
            }}
            className={cn(
              "h-full w-full pt-[calc(env(safe-area-inset-top)+64px)] pb-[calc(env(safe-area-inset-bottom)+92px)]",
              allowVerticalScroll ? "overflow-y-auto" : "overflow-hidden",
            )}
          >
            {renderSlide(contentReady)}
          </motion.div>
        </AnimatePresence>
      </main>

      {showNavigation ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+24px)] z-40 px-5 sm:px-8">
          <div className="pointer-events-auto mx-auto flex w-full max-w-4xl items-center justify-between">
            <motion.button
              type="button"
              onClick={onPrev}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              className={cn(
                "h-12 rounded-full px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent/60",
                showBack ? "opacity-100" : "invisible",
              )}
            >
              Back {"<-"}
            </motion.button>

            <motion.button
              type="button"
              disabled={nextDisabled}
              whileTap={nextDisabled ? undefined : { scale: 0.96 }}
              animate={celebrate ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={handleNext}
              className={cn(
                "h-12 min-w-[140px] rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm",
                "transition-opacity",
                nextDisabled && "cursor-not-allowed opacity-50",
              )}
            >
              {nextLabel} {"->"}
            </motion.button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
