"use client";

import { IconArrowLeft, IconDotsVertical } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type StickyHeaderProps = {
  folderName: string;
  breadcrumbSegments: [string, string, string];
};

export function StickyHeader({
  folderName,
  breadcrumbSegments,
}: StickyHeaderProps) {
  const router = useRouter();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-stone-200/60 bg-white/90 shadow-sm backdrop-blur-sm dark:border-stone-800/60 dark:bg-stone-900/90">
        <div className="space-y-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 rounded-md"
              onClick={() => router.back()}
            >
              <IconArrowLeft className="size-4" />
              <span className="sr-only">Go back</span>
            </Button>

            <h1 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
              {folderName}
            </h1>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-md"
                  />
                }
              >
                <IconDotsVertical className="size-4" />
                <span className="sr-only">More options</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 border-stone-200 dark:border-stone-800"
              >
                <DropdownMenuItem>Sort</DropdownMenuItem>
                <DropdownMenuItem>Select mode</DropdownMenuItem>
                <DropdownMenuItem>Make Offline</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Breadcrumb className="overflow-hidden">
            <BreadcrumbList className="flex-nowrap overflow-hidden text-xs text-stone-500 dark:text-stone-400">
              <BreadcrumbItem className="min-w-0 shrink truncate">
                <span className="truncate">{breadcrumbSegments[0]}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-stone-400 dark:text-stone-500" />
              <BreadcrumbItem className="min-w-0 shrink truncate">
                <span className="truncate">{breadcrumbSegments[1]}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-stone-400 dark:text-stone-500" />
              <BreadcrumbItem className="min-w-0 shrink truncate">
                <BreadcrumbPage className="truncate text-stone-600 dark:text-stone-300">
                  {breadcrumbSegments[2]}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Bottom divider gradient — prevents blank transition */}
      <div className="h-px bg-linear-to-r from-transparent via-stone-200 to-transparent dark:via-stone-800" />
    </>
  );
}
