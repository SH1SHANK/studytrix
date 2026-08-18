"use client";

import { CommandBar } from "@/features/command/ui/CommandBar";

interface ScopedCommandBarProps {
  placeholder?: string;
}

export function ScopedCommandBar({ placeholder }: ScopedCommandBarProps) {
  return <CommandBar placeholder={placeholder} />;
}
