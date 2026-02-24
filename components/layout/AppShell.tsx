import { Suspense, type ReactNode } from "react";

import { ScopedCommandBar } from "@/features/command/ui/ScopedCommandBar";
import { ShareProgressDrawer } from "@/features/share/ui/ShareProgressDrawer";
import { AcademicProvider } from "@/components/layout/AcademicContext";
import { AppRuntimeBanners } from "@/components/layout/AppRuntimeBanners";
import { Header } from "@/components/layout/Header";
import { GlobalStorageSetupSheet } from "@/features/offline/ui/StorageSetupSheet";
import { Toaster } from "@/components/ui/sonner";
import { APP_VERSION, formatVersionLabel } from "@/features/version/version";

type AppShellProps = {
  children: ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  hideHeaderFilters?: boolean;
  commandPlaceholder?: string;
};

function GlobalFooter() {
  return (
    <footer className="mt-8 border-t border-border/60 pb-28 pt-8 text-center text-[10px] leading-relaxed text-muted-foreground/80 border-border/60 text-muted-foreground/80">
      <p>Studytrix is built and maintained by the Attendrix Team.</p>
      <p className="mt-1">Study materials sourced from the LaunchPad Community Drive.</p>
      <p className="mt-1.5 font-medium text-muted-foreground/70">
        {formatVersionLabel(APP_VERSION)}
      </p>
    </footer>
  );
}

export function AppShell({
  children,
  showHeader = true,
  headerTitle,
  hideHeaderFilters,
  commandPlaceholder,
}: AppShellProps) {
  return (
    <AcademicProvider>
      <div className="flex min-h-screen flex-col overflow-x-hidden pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          <Suspense fallback={null}>
            {showHeader ? <Header title={headerTitle} hideFilters={hideHeaderFilters} /> : null}
          </Suspense>
          <main className="flex-1 min-h-0 scroll-smooth">
            <div className="px-4 pt-3 sm:px-5">
              <AppRuntimeBanners />
            </div>
            {children}
            <GlobalFooter />
          </main>
        </div>
        <Suspense fallback={null}>
          <ScopedCommandBar placeholder={commandPlaceholder} />
        </Suspense>
        <ShareProgressDrawer />
        <Toaster />
        <GlobalStorageSetupSheet />
      </div>
    </AcademicProvider>
  );
}
