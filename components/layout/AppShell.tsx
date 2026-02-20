import { Suspense, type ReactNode } from "react";

import { CommandBar } from "@/components/command/CommandBar";
import { ShareProgressDrawer } from "@/components/share/ShareProgressDrawer";
import { AcademicProvider } from "@/components/layout/AcademicContext";
import { Header } from "@/components/layout/Header";
import { Toaster } from "@/components/ui/sonner";

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
      <div className="flex min-h-screen flex-col overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          {showHeader ? <Header title={headerTitle} hideFilters={hideHeaderFilters} /> : null}
          <main className="flex-1 overflow-y-auto scroll-smooth">
            {children}
            <GlobalFooter />
          </main>
        </div>
        <Suspense fallback={null}>
          <CommandBar placeholder={commandPlaceholder} />
        </Suspense>
        <ShareProgressDrawer />
        <Toaster />
      </div>
    </AcademicProvider>
  );
}
