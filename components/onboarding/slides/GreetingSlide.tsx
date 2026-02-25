"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

type GreetingSlideProps = {
  name: string;
  ready: boolean;
  onContinue: () => void;
};

const SPARKLES = [
  { position: "top-0 left-1/2", x: -6, y: -20 },
  { position: "top-4 right-2", x: 16, y: -12 },
  { position: "top-1/2 right-0", x: 18, y: 2 },
  { position: "bottom-4 right-4", x: 10, y: 14 },
  { position: "bottom-0 left-1/2", x: -2, y: 18 },
  { position: "bottom-4 left-2", x: -14, y: 12 },
  { position: "top-1/2 left-0", x: -16, y: -2 },
  { position: "top-3 left-6", x: -10, y: -14 },
];

export function GreetingSlide({ name, ready, onContinue }: GreetingSlideProps) {
  const trimmedName = name.trim();
  const firstName = trimmedName.split(/\s+/)[0] ?? "";
  const hasName = firstName.length > 0;

  useEffect(() => {
    if (!ready) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onContinue();
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [onContinue, ready]);

  return (
    <button
      type="button"
      onClick={onContinue}
      className="relative h-full w-full bg-background text-left"
    >
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div className="relative max-w-2xl">
          {hasName ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: 0.15, duration: 0.25, ease: "easeOut" }}
              className="text-sm text-muted-foreground"
            >
              Hello there,
            </motion.p>
          ) : null}

          <div className="relative mt-2 overflow-hidden py-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={ready ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{
                delay: hasName ? 0.4 : 0.2,
                scale: { type: "spring", stiffness: 460, damping: 20 },
                opacity: { duration: 0.2 },
              }}
              className="relative inline-flex"
              style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)" }}
            >
              {hasName ? (
                firstName.split("").map((char, index) => (
                  <motion.span
                    key={`${char}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                    transition={{ delay: 0.4 + (index * 0.03), duration: 0.2, ease: "easeOut" }}
                    className="font-bold tracking-tight text-foreground"
                  >
                    {char}
                  </motion.span>
                ))
              ) : (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ delay: 0.2, duration: 0.25, ease: "easeOut" }}
                  className="font-bold tracking-tight text-foreground"
                >
                  Hello there!
                </motion.span>
              )}

              {hasName ? (
                <>
                  {SPARKLES.map((sparkle, index) => (
                    <span
                      key={`${sparkle.position}-${index}`}
                      className={`onboarding-sparkle-dot ${sparkle.position}`}
                      style={{
                        animationDelay: `${0.8 + (index * 0.03)}s`,
                        ["--sparkle-x" as string]: `${sparkle.x}px`,
                        ["--sparkle-y" as string]: `${sparkle.y}px`,
                      }}
                    />
                  ))}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={ready ? { opacity: [0, 0.55, 0.25] } : { opacity: 0 }}
                    transition={{ delay: 2, duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/8 blur-2xl"
                  />
                </>
              ) : null}
            </motion.div>
          </div>

          {hasName ? (
            <>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ delay: 1, duration: 0.25, ease: "easeOut" }}
                className="mt-2 text-base text-foreground"
              >
                Welcome to Studytrix.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ delay: 1.4, duration: 0.25, ease: "easeOut" }}
                className="mt-1 text-sm text-muted-foreground"
              >
                Your academic workspace is ready.
              </motion.p>
            </>
          ) : null}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={ready ? { opacity: 1, y: [8, 0, 8] } : { opacity: 0, y: 8 }}
        transition={{ delay: 2.5, duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute bottom-[calc(env(safe-area-inset-bottom)+36px)] left-1/2 -translate-x-1/2 text-sm font-medium text-muted-foreground"
      >
        Swipe to continue {"->"}
      </motion.p>
    </button>
  );
}
