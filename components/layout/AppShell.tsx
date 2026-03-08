import { Suspense, type ReactNode } from "react";
import Link from "next/link";

import { AcademicProvider } from "@/components/layout/AcademicContext";
import { AppRuntimeBanners } from "@/components/layout/AppRuntimeBanners";
import { Header } from "@/components/layout/Header";
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
    <footer className="mt-6 border-t border-border/45 pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      <div
        className={`mx-auto w-full px-4 sm:px-5 ${
          contentWidth === "compact" ? "max-w-3xl" : "max-w-none"
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            Built by Attendrix Team · Content via LaunchPad Community Drive
          </p>

          <nav
            aria-label="Legal and policy links"
            className="flex flex-wrap items-center justify-center gap-1.5"
          >
            <Link
              href="/terms"
              className="rounded-full px-2.5 py-1 text-[11px] text-muted-foreground/80 transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="rounded-full px-2.5 py-1 text-[11px] text-muted-foreground/80 transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              Privacy
            </Link>
            <Link
              href="/disclaimer"
              className="rounded-full px-2.5 py-1 text-[11px] text-muted-foreground/80 transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              Disclaimer
            </Link>
            <Link
              href="/data-handling"
              className="rounded-full px-2.5 py-1 text-[11px] text-muted-foreground/80 transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              Data Handling
            </Link>
          </nav>

          <p className="text-[10px] font-medium tracking-wide text-muted-foreground/55">
            {formatVersionLabel(APP_VERSION)}
          </p>
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
    <AcademicProvider>
      <div className="flex min-h-screen flex-col overflow-x-hidden pt-[env(safe-area-inset-top)]">
        <div
          className={`mx-auto flex w-full flex-1 flex-col ${
            contentWidth === "compact" ? "max-w-3xl" : "max-w-none"
          }`}
        >
          <Suspense fallback={null}>
            {showHeader ? <Header title={headerTitle} hideFilters={hideHeaderFilters} /> : null}
          </Suspense>
          <main className="flex-1 min-h-0 scroll-smooth">
            <div className="px-4 pt-3 sm:px-5">
              <AppRuntimeBanners />
            </div>
            {children}
            <GlobalFooter contentWidth={contentWidth} />
          </main>
        </div>
        <AppShellRuntimeMounts commandPlaceholder={commandPlaceholder} />
      </div>
    </AcademicProvider>
  );
}
