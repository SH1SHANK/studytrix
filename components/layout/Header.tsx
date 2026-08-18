"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, BookOpen, Menu, Search, Share2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { shareCurrentPage } from "@/features/share/share.page";
import { useSetting } from "@/ui/hooks/useSettings";
import { useCommandCenterStore } from "@/features/command/command-center.store";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { useState } from "react";

const DownloadButton = dynamic(
  () => import("@/features/download/ui/DownloadButton").then((mod) => mod.DownloadButton),
  { ssr: false },
);
const SettingsMenu = dynamic(
  () => import("@/features/settings/ui/SettingsMenu").then((mod) => mod.SettingsMenu),
  { ssr: false },
);

interface HeaderProps {
  title?: string;
  hideFilters?: boolean;
}

export function Header({ title }: HeaderProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [compactMode] = useSetting("compact_mode");
  const isCompact = compactMode === true;
  const isRootPage = pathname === "/";
  const setCommandOpen = useCommandCenterStore((state) => state.setOpen);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={isCompact ? "px-4 pt-3 pb-2 sm:px-6" : "px-4 pt-3 pb-3 sm:px-6"}>
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Mobile Drawer / Back Button / Breadcrumb Title */}
        <div className="flex min-w-0 items-center gap-2">
          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
                  aria-label="Open navigation menu"
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <AppSidebar onNavigate={() => setMobileMenuOpen(false)} className="h-full border-r-0" />
              </SheetContent>
            </Sheet>
          </div>

          {!isRootPage ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Go back"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/");
                }
              }}
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : (
            <Link
              href="/"
              className="hidden md:flex items-center gap-2 font-bold text-base tracking-tight text-foreground"
            >
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <BookOpen className="size-4" />
              </div>
              <span className="font-semibold">Studytrix</span>
            </Link>
          )}

          {title && !isRootPage ? (
            <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          ) : null}
        </div>

        {/* Center / Right: Quick Search Button & Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCommandOpen(true)}
            className="h-8 gap-2 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground md:w-56 justify-between bg-muted/40"
          >
            <div className="flex items-center gap-1.5">
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search library...</span>
              <span className="sm:hidden">Search</span>
            </div>
            <kbd className="hidden md:inline-flex h-4 select-none items-center gap-0.5 rounded border bg-background px-1 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Button
              type="button"
              aria-label="Share current page"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => {
                void shareCurrentPage({
                  title: title ?? "Studytrix",
                  text: "Open this Studytrix workspace.",
                });
              }}
            >
              <Share2 className="size-4" />
            </Button>
            <DownloadButton className="h-8 gap-1.5 rounded-lg px-2 text-xs" compact />
            <SettingsMenu className="size-8" />
          </div>
        </div>
      </div>
    </header>
  );
}
