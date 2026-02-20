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
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/60 shadow-sm",
        disableGlass ? "bg-card border-border" : "bg-card/90 border-border/60 backdrop-blur-sm",
      )}
    >
      <div className="space-y-1 px-4 py-3">
        {/* Row 1 — Navigation bar */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Go back"
            className="size-11 shrink-0 rounded-lg transition-all duration-200 hover:bg-muted/60 active:scale-[0.97]"
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

          <h1 className="min-w-0 flex-1 truncate font-heading text-lg font-semibold tracking-tight text-foreground">
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
                  className="size-11 shrink-0 rounded-lg transition-all duration-200 hover:bg-muted/60 active:scale-[0.97]"
                />
              }
            >
              <IconDotsVertical className="size-[18px] text-muted-foreground" />
              <span className="sr-only">More options</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-44 border-border shadow-md"
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
        <nav className="pl-1 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1" aria-label="Breadcrumb">
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
                    type="button"
                    className={
                      isLast
                        ? "max-w-[200px] truncate rounded-sm text-left text-[13px] font-semibold text-foreground"
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
