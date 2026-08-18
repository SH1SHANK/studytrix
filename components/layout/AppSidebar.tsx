"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  Files,
  HardDrive,
  Home,
  Plus,
  Settings,
  Tag,
  BookOpen,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRxWorkspaces } from "@/hooks/useRxWorkspaces";
import { AddWorkspaceDialog } from "@/features/workspace/ui/AddWorkspaceDialog";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { workspaces } = useRxWorkspaces();
  const [addWorkspaceOpen, setAddWorkspaceOpen] = useState(false);

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Recent", href: "/recent", icon: Clock },
    { label: "All Files", href: "/files", icon: Files },
    { label: "Tags", href: "/tags", icon: Tag },
    { label: "Drive Sources", href: "/sources", icon: HardDrive },
  ];

  return (
    <>
      <aside
        className={cn(
          "flex flex-col border-r border-border/50 bg-card/40 backdrop-blur-md",
          className,
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center gap-2.5 px-4 border-b border-border/40">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-2.5 font-bold text-sm tracking-tight text-foreground transition-opacity hover:opacity-90"
          >
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <BookOpen className="size-4" />
            </div>
            <span>Studytrix</span>
          </Link>
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Workspaces Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2.5 pb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Workspaces
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setAddWorkspaceOpen(true)}
                className="size-5 rounded text-muted-foreground hover:text-foreground"
                aria-label="Create workspace"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>

            <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
              {workspaces.map((ws) => {
                const isActive = pathname.startsWith(`/workspace/${ws.id}`);
                return (
                  <Link
                    key={ws.id}
                    href={`/workspace/${ws.id}`}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                      <span className="truncate">{ws.name}</span>
                    </div>
                    {ws.itemCount ? (
                      <span className="text-[10px] text-muted-foreground/60">
                        {ws.itemCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}

              {workspaces.length === 0 ? (
                <p className="px-2.5 py-2 text-[11px] text-muted-foreground/70">
                  No workspaces yet
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bottom Settings Link */}
        <div className="p-3 border-t border-border/40">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              pathname.startsWith("/settings")
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Settings className="size-4 shrink-0" />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      <AddWorkspaceDialog
        open={addWorkspaceOpen}
        onOpenChange={setAddWorkspaceOpen}
      />
    </>
  );
}
