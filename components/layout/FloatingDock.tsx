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
import { CommandShortcut } from "@/components/ui/command";
import { useEffect, useMemo, useState } from "react";

interface FloatingDockProps {
  isPaletteOpen: boolean;
  onOpenPalette: () => void;
  placeholder?: string;
}

const SCOPE_SUMMARY_STORAGE_KEY = "studytrix.command.scopeSummary.v1";
const SCOPE_SUMMARY_EVENT = "studytrix:command-scope-summary";

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromStorage = () => {
      try {
        const next = window.sessionStorage.getItem(SCOPE_SUMMARY_STORAGE_KEY) ?? "";
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

    const mql = window.matchMedia("(pointer: coarse)");
    const onPointerChange = () => setIsCoarsePointer(mql.matches);
    onPointerChange();
    mql.addEventListener("change", onPointerChange);

    return () => {
      window.removeEventListener(SCOPE_SUMMARY_EVENT, onScopeSummary);
      window.removeEventListener("focus", syncFromStorage);
      mql.removeEventListener("change", onPointerChange);
    };
  }, []);

  const searchTitle = useMemo(
    () =>
      scopeSummary
        ? `Search command palette (scope: ${scopeSummary})`
        : "Search command palette",
    [scopeSummary],
  );

  const navItems = [
    { id: "home", title: "Home", icon: IconHome, path: "/", match: (p: string) => p === "/" },
    { id: "downloads", title: "Downloads", icon: IconDownload, path: "/downloads", match: (p: string) => p.startsWith("/downloads") },
    { id: "search", type: "search" as const },
    { id: "storage", title: "Storage", icon: IconDatabase, path: "/storage", match: (p: string) => p.startsWith("/storage") },
    { id: "settings", title: "Settings", icon: IconSettings, path: "/settings", match: (p: string) => p.startsWith("/settings") },
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
        "fixed bottom-[max(env(safe-area-inset-bottom),0.75rem)] left-0 right-0 z-40 mx-auto flex w-full max-w-fit items-center justify-center transition-all duration-500 sm:bottom-5",
        isPaletteOpen ? "pointer-events-none translate-y-12 opacity-0" : "translate-y-0 opacity-100",
      )}
    >
      <motion.div
        className="relative flex h-14 sm:h-16 items-center gap-1 sm:gap-2 rounded-full border border-border/80 bg-background/80 p-1.5 sm:p-2 shadow-xl backdrop-blur-xl"
        onMouseLeave={() => setHoveredIdx(null)}
        layout
      >
        <AnimatePresence>
          {navItems.map((item, idx) => {
            if (item.type === "search") {
              return (
                <div key="search" className="flex items-center px-1">
                  <motion.button
                    type="button"
                    onClick={onOpenPalette}
                    layout // w-48 was too big for small screens, adjusted to w-32 or w-40, then sm:w-48
                    className={cn(
                      "group flex h-10 items-center justify-between gap-1 rounded-full bg-primary/10 px-2 font-normal text-primary shadow-sm ring-1 ring-primary/20 transition-all hover:bg-primary/15 hover:shadow-md active:scale-95 sm:h-11 sm:w-48 sm:gap-2 sm:px-4 sm:justify-between xl:w-56",
                      isCoarsePointer ? "w-[min(52vw,220px)] justify-between" : "w-12 justify-center sm:justify-between",
                    )}
                    title={searchTitle}
                  >
                    <div className="flex items-center gap-2">
                      <IconSearch className="size-5 sm:size-[18px] text-primary transition-colors group-hover:text-primary" />
                      <span className={cn("max-w-28 truncate", isCoarsePointer ? "block" : "hidden sm:block")}>
                        {scopeSummary || `${placeholder.split(" ")[0]}...`}
                      </span>
                    </div>
                    {scopeSummary ? (
                      <span className="hidden max-w-24 truncate rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline">
                        Scoped
                      </span>
                    ) : (
                      <CommandShortcut className="hidden border-primary/20 bg-primary/20 text-primary sm:inline opacity-80">
                        ⌘K
                      </CommandShortcut>
                    )}
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
                    "relative size-10 sm:size-11 rounded-full transition-colors duration-200",
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
