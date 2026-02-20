"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  IconColorSwatch,
  IconDatabase,
  IconSettings,
  IconTag,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeBottomSheet } from "@/components/theme/ThemeBottomSheet";
import { getThemeLabel } from "@/features/theme/theme.constants";
import { cn } from "@/lib/utils";

interface SettingsMenuProps {
  className?: string;
}

export function SettingsMenu({ className }: SettingsMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);

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
        <DropdownMenuContent align="end" className="w-[260px] p-2">
          <div className="mb-2 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Appearance
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 w-full justify-start rounded-lg border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
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
          
          <DropdownMenuSeparator />

          <div className="mt-1.5 flex flex-col gap-0.5">
            {pathname !== "/settings" && (
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="flex items-center gap-3 rounded-lg py-2.5 cursor-pointer"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                  <IconSettings className="size-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none text-foreground">Settings</span>
                </div>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem
              onClick={() => router.push("/storage")}
              className="flex items-center gap-3 rounded-lg py-2.5 cursor-pointer"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <IconDatabase className="size-4 text-primary" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium leading-none text-foreground">Storage Manager</span>
                <span className="text-[10px] leading-none text-muted-foreground">Review offline data</span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => router.push("/tags")}
              className="flex items-center gap-3 rounded-lg py-2.5 cursor-pointer"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                <IconTag className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium leading-none text-foreground">Manage Tags</span>
                <span className="text-[10px] leading-none text-muted-foreground">Organize your files</span>
              </div>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThemeBottomSheet open={themeSheetOpen} onOpenChange={setThemeSheetOpen} />
    </>
  );
}
