"use client";

import {
  IconChevronDown,
  IconDeviceLaptop,
  IconMoon,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { useTheme } from "next-themes";

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

const DEPARTMENT_OPTIONS = Object.keys(DEPARTMENT_MAP);

export function Header() {
  const { theme, setTheme } = useTheme();
  const { department, setDepartment, semester, setSemester } =
    useAcademicContext();
  const semesters = useMemo(() => Array.from({ length: 8 }, (_, i) => i + 1), []);
  const departmentLabel = getDepartmentName(department);

  return (
    <header className="px-4 pt-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-11 px-0 text-xl font-semibold tracking-tight text-stone-900 transition-all duration-200 active:scale-[0.98] dark:text-stone-100"
                  />
                }
              >
                <span className="truncate">{departmentLabel}</span>
                <IconChevronDown className="size-3.5 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-44 origin-top-left border-stone-200 dark:border-stone-800"
              >
                {DEPARTMENT_OPTIONS.map((id) => (
                  <DropdownMenuItem key={id} onClick={() => setDepartment(id)}>
                    {getDepartmentName(id)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-xl text-stone-300 dark:text-stone-600">
              ·
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="relative h-11 px-0 text-xl font-semibold tracking-tight text-stone-900 transition-all duration-200 active:scale-[0.98] dark:text-stone-100"
                  />
                }
              >
                <span className="truncate">{`Semester ${semester}`}</span>
                <IconChevronDown className="size-3.5 opacity-60" />
                {/* Underline accent */}
                <span className="absolute -bottom-0.5 left-0 h-[2px] w-6 rounded-full bg-indigo-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-40 origin-top-left border-stone-200 dark:border-stone-800"
              >
                {semesters.map((value) => (
                  <DropdownMenuItem key={value} onClick={() => setSemester(value)}>
                    {`Semester ${value}`}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="Open settings"
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-md transition-all duration-200 active:scale-[0.98] hover:bg-stone-100 dark:hover:bg-stone-800"
                />
              }
            >
              <IconSettings className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                className={
                  theme === "light"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : ""
                }
                onClick={() => setTheme("light")}
              >
                <IconSun />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem
                className={
                  theme === "dark"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : ""
                }
                onClick={() => setTheme("dark")}
              >
                <IconMoon />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem
                className={
                  theme === "system"
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                    : ""
                }
                onClick={() => setTheme("system")}
              >
                <IconDeviceLaptop />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-stone-500 dark:text-stone-400">
          Keep momentum with one focused session today.
        </p>
      </div>
    </header>
  );
}
