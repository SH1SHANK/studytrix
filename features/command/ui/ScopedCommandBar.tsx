"use client";

import { CommandBar } from "@/features/command/ui/CommandBar";
import { useSearchScope } from "@/features/intelligence/useSearchScope";

type ScopedCommandBarProps = {
  placeholder?: string;
};

export function ScopedCommandBar({ placeholder }: ScopedCommandBarProps) {
  const searchScope = useSearchScope();

  return (
    <CommandBar
      placeholder={placeholder}
      navigationScope={searchScope}
    />
  );
}
