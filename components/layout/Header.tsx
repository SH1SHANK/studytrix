"use client";

import {
  IconArrowLeft,
  IconChevronDown,
  IconDatabase,
  IconSettings,
  IconTag,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useAcademicContext,
} from "@/components/layout/AcademicContext";
import { DownloadButton } from "@/components/download/DownloadButton";
import { DEPARTMENT_MAP, getDepartmentName } from "@/lib/academic";
import { ThemeBottomSheet } from "@/components/theme/ThemeBottomSheet";
import { getThemeLabel } from "@/features/theme/theme.constants";

const DEPARTMENT_OPTIONS = Object.keys(DEPARTMENT_MAP);

export function Header({ title, hideFilters }: { title?: string; hideFilters?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const { department, setDepartment, semester, setSemester } =
    useAcademicContext();
  const semesters = useMemo(() => Array.from({ length: 8 }, (_, i) => i + 1), []);
  const departmentLabel = getDepartmentName(department);
  const isRootPage = pathname === "/";
  const contextTriggerClass =
    "h-10 min-w-0 shrink gap-1 rounded-md px-1.5 text-lg font-semibold tracking-tight text-foreground transition-all duration-200 active:scale-[0.98] hover:bg-muted text-foreground hover:bg-muted sm:text-xl";

  return (
    <header className="px-4 pt-5 sm:pt-6">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {!isRootPage ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 rounded-md transition-all duration-200 active:scale-[0.98] hover:bg-muted"
                aria-label="Go back"
                onClick={() => {
                  if (window.history.length > 1) {
                    router.back();
                    return;
                  }

                  router.push("/");
                }}
              >
                <IconArrowLeft className="size-4" />
              </Button>
            ) : null}
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
              {hideFilters ? (
                <h1 className="truncate pl-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {title}
                </h1>
              ) : (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          className={`${contextTriggerClass} max-w-[clamp(9rem,45vw,18rem)]`}
                        />
                      }
                    >
                      <span className="min-w-0 truncate">{departmentLabel}</span>
                      <IconChevronDown className="size-3.5 shrink-0 opacity-60" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-44 origin-top-left border-border"
                    >
                      {DEPARTMENT_OPTIONS.map((id) => (
                        <DropdownMenuItem key={id} onClick={() => setDepartment(id)}>
                          {getDepartmentName(id)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <span className="text-lg text-muted-foreground/80 dark:text-muted-foreground">
                    ·
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          className={`${contextTriggerClass} relative max-w-[clamp(6.5rem,28vw,11rem)]`}
                        />
                      }
                    >
                      <span className="min-w-0 truncate">{`Semester ${semester}`}</span>
                      <IconChevronDown className="size-3.5 shrink-0 opacity-60" />
                      <span className="pointer-events-none absolute -bottom-0.5 left-1.5 h-[2px] w-7 rounded-full bg-primary" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-40 origin-top-left border-border"
                    >
                      {semesters.map((value) => (
                        <DropdownMenuItem key={value} onClick={() => setSemester(value)}>
                          {`Semester ${value}`}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <DownloadButton className="h-9 gap-1.5 rounded-md px-2.5 text-sm" compact />

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label="Open settings"
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-md transition-all duration-200 active:scale-[0.98] hover:bg-muted"
                  />
                }
              >
                <IconSettings className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[260px] p-2">
                <div className="mb-2 px-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Appearance</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1.5 h-9 w-full justify-start rounded-lg border-border bg-card px-3 text-xs font-medium text-foreground hover:bg-muted"
                    onClick={() => setThemeSheetOpen(true)}
                  >
                    Theme: {getThemeLabel(theme)}
                  </Button>
                </div>
                
                <DropdownMenuSeparator />

                <div className="mt-1.5 flex flex-col gap-0.5">
                  {pathname !== "/settings" && (
                    <DropdownMenuItem
                      onClick={() => router.push("/settings")}
                      className="flex items-center gap-3 rounded-lg py-2.5 cursor-pointer"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <IconSettings className="size-4 text-foreground/80 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none text-foreground">Settings</span>
                      </div>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuItem
                    onClick={() => router.push("/storage")}
                    className="flex items-center gap-3 rounded-lg py-2.5 cursor-pointer"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <IconDatabase className="size-4 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium leading-none text-foreground">Storage Manager</span>
                      <span className="text-[10px] leading-none text-muted-foreground">Review offline data</span>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={() => router.push("/tags")}
                    className="flex items-center gap-3 rounded-lg py-2.5 cursor-pointer"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <IconTag className="size-4 text-foreground/80 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium leading-none text-foreground">Manage Tags</span>
                      <span className="text-[10px] leading-none text-muted-foreground">Organize your files</span>
                    </div>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isRootPage && (
          <p className="pl-0.5 text-sm leading-snug text-muted-foreground">
            Keep momentum with one focused session today.
          </p>
        )}
      </div>
      <ThemeBottomSheet open={themeSheetOpen} onOpenChange={setThemeSheetOpen} />
    </header>
  );
}
