"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";

import { useCustomFoldersTabsStore } from "@/features/custom-folders/custom-folders.tabs.store";
import { DashboardSharedChrome } from "@/features/dashboard/ui/DashboardSharedChrome";
import { GlobalRepositoryGrid } from "@/features/dashboard/ui/GlobalRepositoryGrid";
import { PersonalRepositoryGrid } from "@/features/dashboard/ui/PersonalRepositoryGrid";
import { cn } from "@/lib/utils";
import { useSetting } from "@/ui/hooks/useSettings";

const SNAP_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
const VELOCITY_THRESHOLD = 500;

export function DashboardSwipeContainer() {
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const activePage = useCustomFoldersTabsStore((state) => state.activePage);
  const setActivePage = useCustomFoldersTabsStore((state) => state.setActivePage);
  const [personalRepositoryVisibleSetting] = useSetting("personal_repository_visible");
  const showPersonalRepository = personalRepositoryVisibleSetting !== false;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const previousWidthRef = useRef(0);
  const x = useMotionValue(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const activeIndex = activePage === "global" ? 0 : 1;

  useEffect(() => {
    const queryPage = searchParams.get("repo") ?? searchParams.get("repository");
    if (!showPersonalRepository && queryPage === "personal") {
      setActivePage("global");
      return;
    }

    if (queryPage === "personal" || queryPage === "global") {
      setActivePage(queryPage);
    }
  }, [searchParams, setActivePage, showPersonalRepository]);

  useEffect(() => {
    if (!showPersonalRepository && activePage === "personal") {
      setActivePage("global");
    }
  }, [activePage, setActivePage, showPersonalRepository]);

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    const element = viewportRef.current;
    const update = () => {
      setViewportWidth(Math.max(0, element.clientWidth));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const targetX = useMemo(
    () => -(activeIndex * viewportWidth),
    [activeIndex, viewportWidth],
  );

  useEffect(() => {
    if (!viewportWidth) {
      return;
    }
    if (previousWidthRef.current === viewportWidth) {
      return;
    }
    previousWidthRef.current = viewportWidth;
    x.jump(-(activePage === "global" ? 0 : viewportWidth));
  }, [viewportWidth, x, activePage]);

  if (!showPersonalRepository) {
    return (
      <section className="relative">
        <DashboardSharedChrome
          activePage="global"
          onPageChange={setActivePage}
          showPersonalRepository={false}
        />
        <GlobalRepositoryGrid showSharedChrome={false} />
      </section>
    );
  }

  if (shouldReduceMotion) {
    return (
      <section className="relative">
        <DashboardSharedChrome
          activePage={activePage}
          onPageChange={setActivePage}
          showPersonalRepository={showPersonalRepository}
        />
        <AnimatePresence mode="wait">
          {activePage === "global" ? (
            <motion.div
              key="global-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <GlobalRepositoryGrid showSharedChrome={false} />
            </motion.div>
          ) : (
            <motion.div
              key="personal-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PersonalRepositoryGrid showSharedChrome={false} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );
  }

  return (
    <section className="relative">
      <DashboardSharedChrome
        activePage={activePage}
        onPageChange={setActivePage}
        showPersonalRepository={showPersonalRepository}
      />

      <div ref={viewportRef} className="overflow-hidden">
        <motion.div
          className="flex w-[200%] touch-pan-y"
          style={{ x }}
          drag={viewportWidth > 0 ? "x" : false}
          dragConstraints={{ left: -viewportWidth, right: 0 }}
          dragDirectionLock
          dragMomentum={false}
          dragElastic={0.05}
          onDragEnd={(_, info) => {
            const absDistance = Math.abs(info.offset.x);
            const absVelocity = Math.abs(info.velocity.x);
            const shouldSwitch = absDistance >= viewportWidth * 0.3 || absVelocity >= VELOCITY_THRESHOLD;

            if (!shouldSwitch) {
              return;
            }

            if (info.offset.x < 0 && activePage === "global") {
              setActivePage("personal");
              return;
            }

            if (info.offset.x > 0 && activePage === "personal") {
              setActivePage("global");
              return;
            }
          }}
          animate={{ x: targetX }}
          transition={SNAP_SPRING}
        >
          <div className={cn("w-screen shrink-0")} style={{ width: viewportWidth || undefined }}>
            <GlobalRepositoryGrid showSharedChrome={false} />
          </div>
          <div className={cn("w-screen shrink-0")} style={{ width: viewportWidth || undefined }}>
            <PersonalRepositoryGrid showSharedChrome={false} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
