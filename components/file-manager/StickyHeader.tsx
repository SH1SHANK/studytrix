"use client";

import { IconArrowLeft, IconChevronRight, IconDotsVertical, IconDownload, IconTag } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSetting } from "@/ui/hooks/useSettings";

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
  const [disableGlass] = useSetting("disable_glass_effects");

  return (
    <header className={cn("sticky top-0 z-30 border-b shadow-sm dark:border-stone-800/60",
      disableGlass ? "bg-white dark:bg-stone-900 border-stone-200" : "bg-white/90 backdrop-blur-sm dark:bg-stone-900/90 border-stone-200/60"
    )}>
      <div className="space-y-1 px-4 py-3">
        {/* Row 1 — Navigation bar */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Go back"
            className="size-11 shrink-0 rounded-lg transition-all duration-200 hover:bg-stone-200/60 active:scale-[0.97] dark:hover:bg-stone-800"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
                return;
              }
              router.push("/");
            }}
          >
            <IconArrowLeft className="size-[18px] text-stone-600 dark:text-stone-400" />
          </Button>

          <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {folderName}
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="More options"
                  className="size-11 shrink-0 rounded-lg transition-all duration-200 hover:bg-stone-200/60 active:scale-[0.97] dark:hover:bg-stone-800"
                />
              }
            >
              <IconDotsVertical className="size-[18px] text-stone-600 dark:text-stone-400" />
              <span className="sr-only">More options</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 border-stone-200 dark:border-stone-800"
            >
              <DropdownMenuItem onClick={() => router.push("/downloads")}>
                <IconDownload />
                Downloads
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/tags")}>
                <IconTag />
                Manage Tags
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Row 2 — Breadcrumb */}
        <nav className="pl-1" aria-label="Breadcrumb">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {breadcrumbSegments.map((segment, index) => {
              const isLast = index === breadcrumbSegments.length - 1;
              return (
                <span key={`${segment.href}-${index}`} className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  {index > 0 ? (
                    <IconChevronRight
                      className="size-3 shrink-0 text-stone-300 dark:text-stone-600"
                      aria-hidden="true"
                    />
                  ) : null}
                  <button
                    type="button"
                    className={
                      isLast
                        ? "max-w-full break-words rounded-sm text-left text-[13px] font-semibold text-stone-900 dark:text-stone-100"
                        : "max-w-full break-words rounded-sm text-left text-[13px] text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
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
