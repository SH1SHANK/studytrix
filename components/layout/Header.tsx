"use client";

import dynamic from "next/dynamic";
import {
  IconArrowLeft,
  IconChevronDown,
  IconShare,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAcademicContext,
} from "@/components/layout/AcademicContext";
import { DEPARTMENT_MAP, getDepartmentName } from "@/lib/academic";
import { shareCurrentPage } from "@/features/share/share.page";
import { useSetting } from "@/ui/hooks/useSettings";

const DEPARTMENT_OPTIONS = Object.keys(DEPARTMENT_MAP);
const DownloadButton = dynamic(
  () => import("@/features/download/ui/DownloadButton").then((mod) => mod.DownloadButton),
  { ssr: false },
);
const SettingsMenu = dynamic(
  () => import("@/features/settings/ui/SettingsMenu").then((mod) => mod.SettingsMenu),
  { ssr: false },
);

export function Header({ title, hideFilters }: { title?: string; hideFilters?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { department, setDepartment, semester, setSemester } =
    useAcademicContext();
  const [compactMode] = useSetting("compact_mode");
  const [showHeaderMotivation] = useSetting("show_header_motivation");
  const [shareIncludeAcademicContext] = useSetting("share_include_academic_context");
  const semesters = useMemo(() => Array.from({ length: 8 }, (_, i) => i + 1), []);
  const isCompact = compactMode === true;
  const departmentLabel = getDepartmentName(department);
  const isRootPage = pathname === "/";
  const contextTriggerClass =
    `min-w-0 shrink gap-1 rounded-md px-1.5 font-semibold tracking-tight text-foreground transition-all duration-200 active:scale-[0.98] hover:bg-muted ${
      isCompact ? "h-9 text-base sm:text-lg" : "h-10 text-lg sm:text-xl"
    }`;
  const hasQueryState = searchParams.toString().length > 0;
  const iconButtonClass = isCompact
    ? "size-9 rounded-md transition-all duration-200 active:scale-[0.98] hover:bg-muted"
    : "size-10 rounded-md transition-all duration-200 active:scale-[0.98] hover:bg-muted";

  return (
    <header className={isCompact ? "px-4 pt-4 sm:pt-5" : "px-4 pt-5 sm:pt-6"}>
      <div className={isCompact ? "space-y-1" : "space-y-1.5"}>
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-2 sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {!isRootPage ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={iconButtonClass}
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
                <h1 className={isCompact ? "truncate pl-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl" : "truncate pl-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl"}>
                  {title}
                </h1>
              ) : (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          className={`${contextTriggerClass} max-w-[clamp(9rem,35vw,28rem)]`}
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
                          className={`${contextTriggerClass} relative max-w-[clamp(6.5rem,24vw,14rem)]`}
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

          <div className="ml-auto flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-auto sm:justify-start sm:gap-2">
            <Button
              type="button"
              aria-label="Share current page"
              variant="ghost"
              size="icon"
              className={isCompact ? "size-9 rounded-lg transition-all hover:bg-muted/60 active:scale-[0.97]" : "size-10 rounded-lg transition-all hover:bg-muted/60 active:scale-[0.97]"}
              onClick={() => {
                void shareCurrentPage({
                  title: title ?? "Studytrix",
                  text: hasQueryState
                    ? "Open this Studytrix page with my active filters."
                    : "Open this Studytrix page.",
                  department: shareIncludeAcademicContext === false ? undefined : department,
                  semester: shareIncludeAcademicContext === false ? undefined : semester,
                });
              }}
            >
              <IconShare className="size-[18px] text-muted-foreground" />
            </Button>
            <DownloadButton className={isCompact ? "h-8 gap-1.5 rounded-md px-2 text-xs" : "h-9 gap-1.5 rounded-md px-2.5 text-sm"} compact />
            <SettingsMenu className={isCompact ? "size-9" : undefined} />
          </div>
        </div>

        {isRootPage && showHeaderMotivation !== false && (
          <p className={isCompact ? "pl-0.5 text-xs leading-snug text-muted-foreground" : "pl-0.5 text-sm leading-snug text-muted-foreground"}>
            Keep momentum with one focused session today.
          </p>
        )}
      </div>

    </header>
  );
}
