"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useCustomFoldersTabsStore } from "@/features/custom-folders/custom-folders.tabs.store";
import { DashboardSharedChrome } from "@/features/dashboard/ui/DashboardSharedChrome";
import { GlobalRepositoryGrid } from "@/features/dashboard/ui/GlobalRepositoryGrid";
import { PersonalRepositoryGrid } from "@/features/dashboard/ui/PersonalRepositoryGrid";
import { cn } from "@/lib/utils";
import { useSetting } from "@/ui/hooks/useSettings";

const SNAP_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };
const VELOCITY_THRESHOLD = 420;
const MIN_SWIPE_DISTANCE = 48;
const SWIPE_DISTANCE_RATIO = 0.14;
const PROJECTED_VELOCITY_FACTOR = 0.16;

function clampIndex(index: number): 0 | 1 {
  if (index <= 0) {
    return 0;
  }
  return 1;
}

function getNextIndexFromSwipe(input: {
  currentIndex: 0 | 1;
  offsetX: number;
  velocityX: number;
  viewportWidth: number;
}): 0 | 1 {
  const { currentIndex, offsetX, velocityX, viewportWidth } = input;
  const threshold = Math.max(MIN_SWIPE_DISTANCE, viewportWidth * SWIPE_DISTANCE_RATIO);
  const projectedOffset = offsetX + (velocityX * PROJECTED_VELOCITY_FACTOR);
  const absoluteVelocity = Math.abs(velocityX);

  if (Math.abs(projectedOffset) < threshold && absoluteVelocity < VELOCITY_THRESHOLD) {
    return currentIndex;
  }

  if (projectedOffset < 0 || velocityX <= -VELOCITY_THRESHOLD) {
    return clampIndex(currentIndex + 1);
  }

  if (projectedOffset > 0 || velocityX >= VELOCITY_THRESHOLD) {
    return clampIndex(currentIndex - 1);
  }

  return currentIndex;
}

export function DashboardSwipeContainer() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activePage = useCustomFoldersTabsStore((state) => state.activePage);
  const setActivePage = useCustomFoldersTabsStore((state) => state.setActivePage);
  const [personalRepositoryVisibleSetting] = useSetting("personal_repository_visible");
  const showPersonalRepository = personalRepositoryVisibleSetting !== false;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const previousWidthRef = useRef(0);
  const syncedQueryRef = useRef(false);
  const x = useMotionValue(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const activeIndex = activePage === "global" ? 0 : 1;
  const canSwipeBetweenRepositories = showPersonalRepository && viewportWidth > 0 && isCoarsePointer;

  const handlePageChange = (nextPage: "global" | "personal") => {
    if (!showPersonalRepository && nextPage === "personal") {
      return;
    }
    if (nextPage === activePage) {
      return;
    }
    setActivePage(nextPage);
  };

  useEffect(() => {
    if (syncedQueryRef.current) {
      return;
    }

    const queryPage = searchParams.get("repo");
    if (!showPersonalRepository && queryPage === "personal") {
      setActivePage("global");
      syncedQueryRef.current = true;
      return;
    }

    if (queryPage === "personal" || queryPage === "global") {
      setActivePage(queryPage);
    }
    syncedQueryRef.current = true;
  }, [searchParams, setActivePage, showPersonalRepository]);

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const currentRepoQuery = searchParams.get("repo");
    if (!showPersonalRepository || activePage === "global") {
      if (currentRepoQuery !== null) {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("repo");
        const nextQuery = nextParams.toString();
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
      }
      return;
    }

    if (currentRepoQuery !== "personal") {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("repo", "personal");
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    }
  }, [activePage, pathname, router, searchParams, showPersonalRepository]);

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
      setViewportWidth(Math.max(0, element.clientWidth || window.innerWidth));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const syncPointer = () => setIsCoarsePointer(mediaQuery.matches);
    syncPointer();
    mediaQuery.addEventListener("change", syncPointer);

    return () => {
      mediaQuery.removeEventListener("change", syncPointer);
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

  return (
    <section className="relative">
      <DashboardSharedChrome
        activePage={activePage}
        onPageChange={handlePageChange}
        showPersonalRepository={showPersonalRepository}
      />

      <div ref={viewportRef} className="overflow-hidden">
        <motion.div
          className="flex w-[200%] touch-pan-y"
          style={{ x }}
          drag={canSwipeBetweenRepositories ? "x" : false}
          dragConstraints={{ left: -viewportWidth, right: 0 }}
          dragDirectionLock
          dragMomentum={false}
          dragElastic={0.12}
          onDragEnd={(_, info) => {
            if (!canSwipeBetweenRepositories) {
              return;
            }

            const nextIndex = getNextIndexFromSwipe({
              currentIndex: activeIndex,
              offsetX: info.offset.x,
              velocityX: info.velocity.x,
              viewportWidth,
            });

            if (nextIndex === activeIndex) {
              return;
            }

            handlePageChange(nextIndex === 0 ? "global" : "personal");
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
