import { Suspense, type ReactNode } from "react";

import { CommandBar } from "@/components/command/CommandBar";
import { AcademicProvider } from "@/components/layout/AcademicContext";
import { Header } from "@/components/layout/Header";

type AppShellProps = {
  children: ReactNode;
  showHeader?: boolean;
  commandPlaceholder?: string;
};

export function AppShell({
  children,
  showHeader = true,
  commandPlaceholder,
}: AppShellProps) {
  return (
    <AcademicProvider>
      <div className="flex min-h-screen flex-col overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          {showHeader ? <Header /> : null}
          <main className="flex-1 overflow-y-auto scroll-smooth">
            {children}
          </main>
        </div>
        <Suspense fallback={null}>
          <CommandBar placeholder={commandPlaceholder} />
        </Suspense>
      </div>
    </AcademicProvider>
  );
}
