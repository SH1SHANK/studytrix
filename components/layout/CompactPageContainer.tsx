"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useSetting } from "@/ui/hooks/useSettings";

type CompactPageContainerProps = {
  children: ReactNode;
  regularClassName: string;
  compactClassName?: string;
  className?: string;
};

export function CompactPageContainer({
  children,
  regularClassName,
  compactClassName,
  className,
}: CompactPageContainerProps) {
  const [compactMode] = useSetting("compact_mode");
  const isCompact = compactMode === true;

  return (
    <div
      className={cn(
        isCompact ? (compactClassName ?? regularClassName) : regularClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}
