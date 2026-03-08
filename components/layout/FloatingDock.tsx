"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconDatabase,
  IconDownload,
  IconHome,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";

interface FloatingDockProps {
  isPaletteOpen: boolean;
  onOpenPalette: () => void;
  placeholder?: string;
}

const SCOPE_SUMMARY_STORAGE_KEY = "studytrix.command.scopeSummary.v1";
const SCOPE_SUMMARY_EVENT = "studytrix:command-scope-summary";
const KEYBOARD_HIDE_THRESHOLD_PX = 110;
const HIDE_ON_SCROLL_DELTA_PX = 18;
const SHOW_ON_SCROLL_DELTA_PX = -12;

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function isEditableElement(target: Element | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement) {
    return !target.disabled && !target.readOnly;
  }

  if (!(target instanceof HTMLInputElement)) {
    return false;
  }

  const inputType = target.type.toLowerCase();
  return (
    !target.disabled && !target.readOnly && !NON_TEXT_INPUT_TYPES.has(inputType)
  );
}

export function FloatingDock({
  isPaletteOpen,
  onOpenPalette,
  placeholder = "Search files, folders...",
}: FloatingDockProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [scopeSummary, setScopeSummary] = useState("");
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [isStandaloneDisplay, setIsStandaloneDisplay] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isScrollHidden, setIsScrollHidden] = useState(false);
  const scrollYRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const keyboardBaselineHeightRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromStorage = () => {
      try {
        const next =
          window.sessionStorage.getItem(SCOPE_SUMMARY_STORAGE_KEY) ?? "";
        setScopeSummary(next);
      } catch {
        setScopeSummary("");
      }
    };

    const onScopeSummary = (event: Event) => {
      const customEvent = event as CustomEvent<{ value?: unknown }>;
      const next =
        typeof customEvent.detail?.value === "string"
          ? customEvent.detail.value
          : "";
      setScopeSummary(next);
    };

    syncFromStorage();
    window.addEventListener(SCOPE_SUMMARY_EVENT, onScopeSummary);
    window.addEventListener("focus", syncFromStorage);

    const pointerMql = window.matchMedia("(pointer: coarse)");
    const standaloneMql = window.matchMedia("(display-mode: standalone)");
    const visualViewport = window.visualViewport;

    const updatePointer = () => setIsCoarsePointer(pointerMql.matches);
    const updateStandalone = () => {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      setIsStandaloneDisplay(standaloneMql.matches || nav.standalone === true);
    };
    const updateViewport = () => {
      const height = visualViewport?.height ?? window.innerHeight;

      const roundedHeight = Math.max(0, Math.round(height));
      const hasEditableFocus = isEditableElement(document.activeElement);

      if (!hasEditableFocus) {
        keyboardBaselineHeightRef.current = Math.max(
          keyboardBaselineHeightRef.current,
          roundedHeight,
        );
        setIsKeyboardOpen(false);
        return;
      }

      const baseline = Math.max(
        keyboardBaselineHeightRef.current,
        roundedHeight,
      );
      keyboardBaselineHeightRef.current = baseline;
      setIsKeyboardOpen(baseline - roundedHeight >= KEYBOARD_HIDE_THRESHOLD_PX);
    };

    const onFocusChange = () => {
      updateViewport();
    };
    const onOrientationChange = () => {
      keyboardBaselineHeightRef.current = 0;
      updateViewport();
    };

    updatePointer();
    updateStandalone();
    updateViewport();

    pointerMql.addEventListener("change", updatePointer);
    standaloneMql.addEventListener("change", updateStandalone);
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", onOrientationChange);
    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusChange);

    return () => {
      window.removeEventListener(SCOPE_SUMMARY_EVENT, onScopeSummary);
      window.removeEventListener("focus", syncFromStorage);
      pointerMql.removeEventListener("change", updatePointer);
      standaloneMql.removeEventListener("change", updateStandalone);
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", onOrientationChange);
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsScrollHidden(false);
    scrollYRef.current = window.scrollY;

    const applyScrollState = () => {
      const nextY = window.scrollY;
      const delta = nextY - scrollYRef.current;
      scrollYRef.current = nextY;

      if (!isCoarsePointer || isPaletteOpen || isKeyboardOpen) {
        setIsScrollHidden(false);
        return;
      }

      if (nextY <= 20) {
        setIsScrollHidden(false);
        return;
      }

      if (delta >= HIDE_ON_SCROLL_DELTA_PX) {
        setIsScrollHidden(true);
        return;
      }

      if (delta <= SHOW_ON_SCROLL_DELTA_PX) {
        setIsScrollHidden(false);
      }
    };

    const onScroll = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        applyScrollState();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [isCoarsePointer, isKeyboardOpen, isPaletteOpen, pathname]);

  const searchTitle = useMemo(
    () =>
      scopeSummary
        ? `Search command palette (scope: ${scopeSummary})`
        : "Search command palette",
    [scopeSummary],
  );
  const dockBottomOffsetPx = useMemo(() => {
    if (!isCoarsePointer) {
      return 20;
    }

    return isStandaloneDisplay ? 14 : 12;
  }, [isCoarsePointer, isStandaloneDisplay]);
  const shouldHideDock =
    isPaletteOpen || (isCoarsePointer && (isKeyboardOpen || isScrollHidden));
  const resolvedPlaceholder = useMemo(() => {
    const normalized = placeholder.trim();
    return normalized.length > 0
      ? normalized
      : "Search files, folders, and actions";
  }, [placeholder]);
  const dockPlaceholderText = useMemo(() => {
    if (scopeSummary) {
      return scopeSummary;
    }

    if (isCoarsePointer) {
      return "Search files & actions";
    }

    return resolvedPlaceholder;
  }, [isCoarsePointer, resolvedPlaceholder, scopeSummary]);
  const searchButtonWidthClass = useMemo(() => {
    if (!isCoarsePointer) {
      return "w-12 justify-center sm:w-56 sm:justify-between lg:w-64 xl:w-72";
    }

    return "w-full min-w-0 justify-between";
  }, [isCoarsePointer]);

  const navItems = [
    {
      id: "home",
      title: "Home",
      icon: IconHome,
      path: "/",
      match: (p: string) => p === "/",
    },
    {
      id: "downloads",
      title: "Downloads",
      icon: IconDownload,
      path: "/downloads",
      match: (p: string) => p.startsWith("/downloads"),
    },
    { id: "search", type: "search" as const },
    {
      id: "storage",
      title: "Storage",
      icon: IconDatabase,
      path: "/storage",
      match: (p: string) => p.startsWith("/storage"),
    },
    {
      id: "settings",
      title: "Settings",
      icon: IconSettings,
      path: "/settings",
      match: (p: string) => p.startsWith("/settings"),
    },
  ];

  // Subtle spring physics for the dock
  const dockSpring = { type: "spring" as const, stiffness: 450, damping: 30 };
  const getIconSpring = (idx: number) => {
    let scale = 1;
    let y = 0;
    if (hoveredIdx !== null && navItems[idx]?.type !== "search") {
      const distance = Math.abs(hoveredIdx - idx);
      if (distance === 0) {
        scale = 1.25;
        y = -4;
      } else if (distance === 1) {
        scale = 1.1;
        y = -1;
      }
    }
    return { scale, y };
  };

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 flex w-full items-center justify-center transition-all duration-300 ease-out",
        shouldHideDock
          ? "pointer-events-none translate-y-20 opacity-0"
          : "translate-y-0 opacity-100",
      )}
      style={{
        bottom: `calc(env(safe-area-inset-bottom) + ${dockBottomOffsetPx}px)`,
      }}
      aria-hidden={shouldHideDock ? true : undefined}
    >
      <motion.div
        className={cn(
          "relative flex items-center rounded-full border border-border/80 bg-background/85 shadow-xl backdrop-blur-xl",
          isCoarsePointer
            ? "mx-1 h-13 w-[calc(100vw-0.75rem)] max-w-[32rem] gap-1 p-1.5"
            : "h-14 gap-1 p-1.5 sm:h-16 sm:gap-2 sm:p-2",
        )}
        onMouseLeave={() => setHoveredIdx(null)}
        layout
      >
        <AnimatePresence>
          {navItems.map((item, idx) => {
            if (item.type === "search") {
              return (
                <div
                  key="search"
                  className={cn(
                    "flex items-center",
                    isCoarsePointer ? "min-w-0 flex-1 px-0.5" : "px-1",
                  )}
                >
                  <motion.button
                    type="button"
                    onClick={onOpenPalette}
                    layout
                    className={cn(
                      "group flex h-10 items-center gap-1 rounded-full bg-primary/10 px-2 font-normal text-primary shadow-sm ring-1 ring-primary/20 transition-all hover:bg-primary/15 hover:shadow-md active:scale-95 sm:h-11 sm:gap-2 sm:px-4",
                      searchButtonWidthClass,
                    )}
                    title={searchTitle}
                  >
                    <div className="flex items-center gap-2">
                      <IconSearch className="size-5 sm:size-[18px] text-primary transition-colors group-hover:text-primary" />
                      <span
                        className={cn(
                          "max-w-32 truncate",
                          isCoarsePointer ? "block" : "hidden sm:block",
                        )}
                      >
                        {dockPlaceholderText}
                      </span>
                    </div>
                  </motion.button>
                </div>
              );
            }

            const isActive = item.match!(pathname);
            const isHovered = hoveredIdx === idx;
            const PIcon = item.icon!;

            return (
              <motion.div
                key={item.id}
                className="relative"
                onMouseEnter={() => setHoveredIdx(idx)}
                animate={getIconSpring(idx)}
                transition={dockSpring}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative rounded-full transition-colors duration-200",
                    isCoarsePointer ? "size-9" : "size-10 sm:size-11",
                    isActive
                      ? "text-primary hover:text-primary bg-primary/10 sm:bg-transparent"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                  onClick={() => router.push(item.path!)}
                  aria-label={item.title}
                >
                  <PIcon className="size-5 sm:size-[22px]" />
                </Button>

                {isActive && (
                  <motion.div
                    layoutId="dock-indicator"
                    className="absolute -bottom-0.5 sm:-bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                    transition={dockSpring}
                  />
                )}

                {/* Optional macOS style tooltip text on hover */}
                {isHovered && !isCoarsePointer && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 2, scale: 0.9 }}
                    transition={dockSpring}
                    className="absolute -top-10 left-1/2 flex -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-sm"
                  >
                    {item.title}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
