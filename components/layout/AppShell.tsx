import { Suspense, type ReactNode } from "react";
import Link from "next/link";

import { AppRuntimeBanners } from "@/components/layout/AppRuntimeBanners";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { APP_VERSION, formatVersionLabel } from "@/features/version/version";
import { AppShellRuntimeMounts } from "@/components/layout/AppShellRuntimeMounts";

type AppShellProps = {
  children: ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  hideHeaderFilters?: boolean;
  commandPlaceholder?: string;
  contentWidth?: "adaptive" | "compact";
};

function GlobalFooter({ contentWidth }: { contentWidth: "adaptive" | "compact" }) {
  return (
    <footer className="mt-8 border-t border-border/40 py-6">
      <div
        className={`mx-auto w-full px-4 sm:px-6 ${
          contentWidth === "compact" ? "max-w-3xl" : "max-w-none"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-muted-foreground/70">
            Studytrix · Local-First Study Workspace
          </p>

          <nav
            aria-label="Legal and policy links"
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <Link
              href="/terms"
              className="text-[11px] text-muted-foreground/80 hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href="/privacy"
              className="text-[11px] text-muted-foreground/80 hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href="/disclaimer"
              className="text-[11px] text-muted-foreground/80 hover:text-foreground transition-colors"
            >
              Disclaimer
            </Link>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[10px] font-medium text-muted-foreground/55">
              {formatVersionLabel(APP_VERSION)}
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({
  children,
  showHeader = true,
  headerTitle,
  hideHeaderFilters,
  commandPlaceholder,
  contentWidth = "adaptive",
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Persistent Sidebar */}
      <AppSidebar className="hidden md:flex w-56 lg:w-60 shrink-0 sticky top-0 h-screen" />

      {/* Main View Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden pt-[env(safe-area-inset-top)]">
        <Suspense fallback={null}>
          {showHeader ? <Header title={headerTitle} hideFilters={hideHeaderFilters} /> : null}
        </Suspense>
        <main className="flex-1 min-h-0">
          <div className="px-4 pt-2 sm:px-6">
            <AppRuntimeBanners />
          </div>
          {children}
        </main>
        <GlobalFooter contentWidth={contentWidth} />
      </div>

      <AppShellRuntimeMounts commandPlaceholder={commandPlaceholder} />
    </div>
  );
}
