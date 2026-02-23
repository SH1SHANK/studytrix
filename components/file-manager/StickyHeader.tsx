"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  IconArrowLeft,
  IconChevronRight,
  IconCopy,
  IconDatabase,
  IconDotsVertical,
  IconDownload,
  IconHistory,
  IconHome,
  IconSettings,
  IconShare,
  IconTag,
} from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSetting } from "@/ui/hooks/useSettings";
import { copyCurrentPageLink, shareCurrentPage } from "@/features/share/share.page";

type StickyHeaderProps = {
  folderName: string;
  breadcrumbSegments: Array<{
    label: string;
    href: string;
  }>;
};

export function StickyHeader({
  folderName,
  breadcrumbSegments,
}: StickyHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [disableGlass] = useSetting("disable_glass_effects");
  const [compactMode] = useSetting("compact_mode");
  const isCompact = compactMode === true;
  const breadcrumbContainerRef = useRef<HTMLElement | null>(null);
  const activeBreadcrumbRef = useRef<HTMLButtonElement | null>(null);
  const frameOneRef = useRef<number | null>(null);
  const frameTwoRef = useRef<number | null>(null);
  const breadcrumbSignature = useMemo(
    () => breadcrumbSegments.map((segment) => `${segment.href}|${segment.label}`).join("::"),
    [breadcrumbSegments],
  );
  const searchSignature = searchParams.toString();

  const clearPendingFrames = useCallback(() => {
    if (frameOneRef.current !== null) {
      window.cancelAnimationFrame(frameOneRef.current);
      frameOneRef.current = null;
    }

    if (frameTwoRef.current !== null) {
      window.cancelAnimationFrame(frameTwoRef.current);
      frameTwoRef.current = null;
    }
  }, []);

  const alignActiveBreadcrumb = useCallback((behavior: ScrollBehavior) => {
    const container = breadcrumbContainerRef.current;
    const activeItem = activeBreadcrumbRef.current;
    if (!container || !activeItem) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeItem.getBoundingClientRect();
    const edgePadding = 12;
    let targetScrollLeft = container.scrollLeft;

    if (activeRect.right > containerRect.right - edgePadding) {
      targetScrollLeft += activeRect.right - (containerRect.right - edgePadding);
    } else if (activeRect.left < containerRect.left + edgePadding) {
      targetScrollLeft -= (containerRect.left + edgePadding) - activeRect.left;
    } else {
      return;
    }

    const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
    const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft));
    if (Math.abs(nextScrollLeft - container.scrollLeft) < 1) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollTo({
      left: nextScrollLeft,
      behavior: reducedMotion ? "auto" : behavior,
    });
  }, []);

  const scheduleBreadcrumbAlignment = useCallback(
    (behavior: ScrollBehavior) => {
      clearPendingFrames();
      frameOneRef.current = window.requestAnimationFrame(() => {
        frameTwoRef.current = window.requestAnimationFrame(() => {
          alignActiveBreadcrumb(behavior);
          frameOneRef.current = null;
          frameTwoRef.current = null;
        });
      });
    },
    [alignActiveBreadcrumb, clearPendingFrames],
  );

  useEffect(
    () => () => {
      clearPendingFrames();
    },
    [clearPendingFrames],
  );

  useEffect(() => {
    scheduleBreadcrumbAlignment("smooth");
  }, [pathname, searchSignature, breadcrumbSignature, scheduleBreadcrumbAlignment]);

  useEffect(() => {
    const container = breadcrumbContainerRef.current;
    const activeItem = activeBreadcrumbRef.current;
    if (!container || !activeItem || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      scheduleBreadcrumbAlignment("auto");
    });
    observer.observe(container);
    observer.observe(activeItem);

    return () => {
      observer.disconnect();
    };
  }, [breadcrumbSignature, scheduleBreadcrumbAlignment]);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/60 shadow-sm",
        disableGlass ? "bg-card border-border" : "bg-card/90 border-border/60 backdrop-blur-sm",
      )}
    >
      <div className={isCompact ? "space-y-0.5 px-4 py-2" : "space-y-1 px-4 py-3"}>
        {/* Row 1 — Navigation bar */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Go back"
            className={isCompact ? "size-9 shrink-0 rounded-lg transition-all duration-200 hover:bg-muted/60 active:scale-[0.97]" : "size-11 shrink-0 rounded-lg transition-all duration-200 hover:bg-muted/60 active:scale-[0.97]"}
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
                return;
              }
              router.push("/");
            }}
          >
            <IconArrowLeft className="size-[18px] text-muted-foreground" />
          </Button>

          <h1 className={isCompact ? "min-w-0 flex-1 truncate font-heading text-base font-semibold tracking-tight text-foreground" : "min-w-0 flex-1 truncate font-heading text-lg font-semibold tracking-tight text-foreground"}>
            {folderName}
          </h1>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Share this page"
            className={isCompact ? "size-9 shrink-0 rounded-lg transition-all duration-200 hover:bg-muted/60 active:scale-[0.97]" : "size-11 shrink-0 rounded-lg transition-all duration-200 hover:bg-muted/60 active:scale-[0.97]"}
            onClick={() => {
              void shareCurrentPage({
                title: folderName,
                text: "Open this Studytrix folder view.",
              });
            }}
          >
            <IconShare className="size-[18px] text-muted-foreground" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="More options"
                  className={isCompact ? "size-9 shrink-0 rounded-lg transition-all duration-200 hover:bg-muted/60 active:scale-[0.97]" : "size-11 shrink-0 rounded-lg transition-all duration-200 hover:bg-muted/60 active:scale-[0.97]"}
                />
              }
            >
              <IconDotsVertical className="size-[18px] text-muted-foreground" />
              <span className="sr-only">More options</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[270px] border-border p-2 shadow-lg"
            >
              <DropdownMenuItem
                onClick={() => router.push("/downloads")}
                className="flex items-center gap-3 rounded-lg py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <IconDownload className="size-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none text-foreground">Downloads</span>
                  <span className="text-[10px] leading-none text-muted-foreground mt-1">Manage transfers</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/tags")}
                className="flex items-center gap-3 rounded-lg py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <IconTag className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none text-foreground">Manage Tags</span>
                  <span className="text-[10px] leading-none text-muted-foreground mt-1">Organize this folder</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/storage")}
                className="flex items-center gap-3 rounded-lg py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <IconDatabase className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none text-foreground">Storage</span>
                  <span className="text-[10px] leading-none text-muted-foreground mt-1">Offline usage and cleanup</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  void shareCurrentPage({
                    title: folderName,
                    text: "Open this Studytrix folder view.",
                  });
                }}
                className="flex items-center gap-3 rounded-lg py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <IconShare className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none text-foreground">Share Current View</span>
                  <span className="text-[10px] leading-none text-muted-foreground mt-1">Includes current folder and query</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  void copyCurrentPageLink();
                }}
                className="flex items-center gap-3 rounded-lg py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <IconCopy className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none text-foreground">Copy Page Link</span>
                  <span className="text-[10px] leading-none text-muted-foreground mt-1">Paste into chat or notes</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="flex items-center gap-3 rounded-lg py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <IconSettings className="size-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground">Settings</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/changelog")}
                className="flex items-center gap-3 rounded-lg py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <IconHistory className="size-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground">Changelog</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => router.push("/")}
                className="flex items-center gap-3 rounded-lg py-2.5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <IconHome className="size-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground">Go to Dashboard</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Row 2 — Breadcrumb */}
        <nav
          ref={breadcrumbContainerRef}
          className={isCompact ? "pl-1 overflow-x-auto whitespace-nowrap scrollbar-hide pb-0.5" : "pl-1 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1"}
          aria-label="Breadcrumb"
        >
          <div className="flex w-max items-center gap-x-1.5 gap-y-1">
            {breadcrumbSegments.map((segment, index) => {
              const isLast = index === breadcrumbSegments.length - 1;
              return (
                <span key={`${segment.href}-${index}`} className="inline-flex shrink-0 items-center gap-1.5">
                  {index > 0 ? (
                    <IconChevronRight
                      className="size-3 shrink-0 text-muted-foreground/80"
                      aria-hidden="true"
                    />
                  ) : null}
                  <button
                    ref={(element) => {
                      if (isLast) {
                        activeBreadcrumbRef.current = element;
                      }
                    }}
                    type="button"
                    className={
                      isLast
                        ? isCompact
                          ? "max-w-[200px] truncate rounded-sm text-left text-xs font-semibold text-foreground"
                          : "max-w-[200px] truncate rounded-sm text-left text-[13px] font-semibold text-foreground"
                        : isCompact
                          ? "max-w-[150px] truncate rounded-sm text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                          : "max-w-[150px] truncate rounded-sm text-left text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    }
                    aria-current={isLast ? "page" : undefined}
                    onClick={() => {
                      router.push(segment.href);
                    }}
                  >
                    {segment.label}
                  </button>
                </span>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
