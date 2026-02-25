"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

import { cn } from "@/lib/utils";

type OnboardingStepperProps = {
  currentStep: number;
  totalSteps: number;
  onStepPress: (stepIndex: number) => void;
};

export function OnboardingStepper({
  currentStep,
  totalSteps,
  onStepPress,
}: OnboardingStepperProps) {
  const progress = totalSteps === 0 ? 0 : (currentStep / totalSteps) * 100;

  return (
    <div
      aria-label={`Step ${currentStep} of ${totalSteps}`}
      className="w-full"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-border/70">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <div className="min-w-12 text-right text-xs text-muted-foreground">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={currentStep}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="inline-block tabular-nums"
            >
              {currentStep}
            </motion.span>
          </AnimatePresence>
          <span className="tabular-nums">/{totalSteps}</span>
        </div>
      </div>

      <LayoutGroup>
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber <= currentStep;

            return (
              <motion.button
                key={stepNumber}
                type="button"
                layout
                disabled={!isCompleted}
                onClick={() => {
                  if (isCompleted) {
                    onStepPress(index);
                  }
                }}
                className={cn(
                  "inline-flex h-5 items-center justify-center rounded-full transition-opacity",
                  isActive ? "w-7" : "w-3",
                  !isCompleted && "cursor-default opacity-40",
                )}
                aria-label={`Go to step ${stepNumber}`}
              >
                {isActive ? (
                  <motion.span
                    layout
                    layoutId="onboarding-stepper-active"
                    className="h-2 w-6 rounded-full bg-primary"
                  />
                ) : (
                  <motion.span
                    layout
                    className="h-2 w-2 rounded-full bg-muted-foreground/40"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}
