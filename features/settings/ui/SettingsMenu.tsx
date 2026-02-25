"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  IconBolt,
  IconBook2,
  IconColorSwatch,
  IconDatabase,
  IconHistory,
  IconKeyboard,
  IconSettings,
  IconTag,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getThemeLabel } from "@/features/theme/theme.constants";
import { cn } from "@/lib/utils";

const ThemeBottomSheet = dynamic(
  () => import("@/features/theme/ui/ThemeBottomSheet").then((mod) => mod.ThemeBottomSheet),
  { ssr: false },
);

interface SettingsMenuProps {
  className?: string;
}

export function SettingsMenu({ className }: SettingsMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);

  const goTo = (href: string) => {
    router.push(href);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Open settings"
              variant="ghost"
              size="icon"
              className={cn(
                "size-10 rounded-lg transition-all hover:bg-muted/60 active:scale-[0.97]",
                className
              )}
            />
          }
        >
          <IconSettings className="size-[18px] text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[280px] p-2">
          <div className="mb-1.5 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Quick Panel
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Core controls and shortcuts
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-card/70 p-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Appearance
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 w-full justify-start rounded-lg border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
              onClick={() => setThemeSheetOpen(true)}
            >
              <div className="flex w-full items-center gap-3">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <IconColorSwatch className="size-3.5 text-muted-foreground" />
                </div>
                <span className="flex-1 text-left">Theme: {getThemeLabel(theme)}</span>
              </div>
            </Button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {pathname !== "/settings" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 justify-start rounded-lg border-border bg-card px-3 text-sm"
                onClick={() => goTo("/settings")}
              >
                <IconSettings className="size-3.5 text-muted-foreground" />
                Settings
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 justify-start rounded-lg border-border bg-card px-3 text-sm"
              onClick={() => goTo("/storage")}
            >
              <IconDatabase className="size-3.5 text-primary" />
              Storage
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 justify-start rounded-lg border-border bg-card px-3 text-sm"
              onClick={() => goTo("/tags")}
            >
              <IconTag className="size-3.5 text-muted-foreground" />
              Tags
            </Button>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                className="!h-10 !rounded-lg border border-border bg-card px-3 text-sm"
              >
                <IconBook2 className="size-3.5 text-muted-foreground" />
                Guides
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent align="end" className="w-52 p-1.5">
                <DropdownMenuItem onClick={() => goTo("/changelog")} className="rounded-md py-2">
                  <IconHistory className="size-3.5 text-muted-foreground" />
                  Changelog
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goTo("/features")} className="rounded-md py-2">
                  <IconBolt className="size-3.5 text-muted-foreground" />
                  Features
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goTo("/shortcuts")} className="rounded-md py-2">
                  <IconKeyboard className="size-3.5 text-muted-foreground" />
                  Shortcut Hints
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goTo("/documentation")} className="rounded-md py-2">
                  <IconBook2 className="size-3.5 text-muted-foreground" />
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goTo("/blog")} className="rounded-md py-2">
                  <IconBook2 className="size-3.5 text-muted-foreground" />
                  Blog
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => goTo("/data-handling")} className="rounded-md py-2">
                  <IconBook2 className="size-3.5 text-muted-foreground" />
                  Data Handling
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goTo("/privacy")} className="rounded-md py-2">
                  <IconBook2 className="size-3.5 text-muted-foreground" />
                  Privacy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => goTo("/terms")} className="rounded-md py-2">
                  <IconBook2 className="size-3.5 text-muted-foreground" />
                  Terms
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </div>

          <DropdownMenuSeparator />
          <div className="px-1 pb-0.5 pt-0.5 text-[10px] text-muted-foreground">
            Reduced quick menu. Open Guides for release notes and docs.
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {themeSheetOpen ? (
        <ThemeBottomSheet open={themeSheetOpen} onOpenChange={setThemeSheetOpen} />
      ) : null}
    </>
  );
}
