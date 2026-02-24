"use client";

import { useMemo, useState } from "react";
import { IconFolderHeart } from "@tabler/icons-react";
import { motion, useReducedMotion } from "framer-motion";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PressableButton } from "@/features/onboarding/ui/PressableButton";
import { DEPARTMENT_MAP, getDepartmentName } from "@/lib/academic";

type AcademicSetupStepProps = {
  department: string;
  semester: number;
  personalRepositoryEnabled: boolean;
  onDepartmentChange: (value: string) => void;
  onSemesterChange: (value: number) => void;
  onPersonalRepositoryChange: (value: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function AcademicSetupStep({
  department,
  semester,
  personalRepositoryEnabled,
  onDepartmentChange,
  onSemesterChange,
  onPersonalRepositoryChange,
  onBack,
  onContinue,
}: AcademicSetupStepProps) {
  const shouldReduceMotion = useReducedMotion();
  const departmentOptions = useMemo(
    () =>
      Object.keys(DEPARTMENT_MAP).map((id) => ({
        value: id,
        label: getDepartmentName(id),
      })),
    [],
  );
  const containerVariants = shouldReduceMotion
    ? undefined
    : {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.08,
          delayChildren: 0.04,
        },
      },
    };
  const itemVariants = shouldReduceMotion
    ? undefined
    : {
      hidden: { opacity: 0, y: 10 },
      show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
    };
  const [focusedField, setFocusedField] = useState<"department" | "semester" | null>(null);

  return (
    <motion.div
      variants={containerVariants}
      initial={shouldReduceMotion ? undefined : "hidden"}
      animate={shouldReduceMotion ? undefined : "show"}
      className="flex h-full flex-col gap-5 px-4 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-6"
    >
      <motion.div variants={itemVariants} className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Academic Setup
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Set your department and semester
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          You can change this later, and you can switch semesters anytime from dashboard controls.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Department
            </label>
            <div className="relative">
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl bg-primary/15 blur-md"
                initial={false}
                animate={{ opacity: focusedField === "department" ? 1 : 0, scale: focusedField === "department" ? 1.01 : 0.985 }}
                transition={{ duration: shouldReduceMotion ? 0.08 : 0.16 }}
              />
              <Select value={department} onValueChange={(value) => value && onDepartmentChange(value)}>
                <SelectTrigger
                  className="relative h-11 w-full rounded-xl px-3.5 text-sm focus-visible:border-primary/55 focus-visible:ring-0"
                  onFocus={() => setFocusedField("department")}
                  onBlur={() => setFocusedField(null)}
                >
                  <SelectValue>{getDepartmentName(department)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current Semester
            </label>
            <div className="relative">
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl bg-primary/15 blur-md"
                initial={false}
                animate={{ opacity: focusedField === "semester" ? 1 : 0, scale: focusedField === "semester" ? 1.01 : 0.985 }}
                transition={{ duration: shouldReduceMotion ? 0.08 : 0.16 }}
              />
              <Select
                value={String(semester)}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }

                  const parsedValue = Number.parseInt(value, 10);
                  if (Number.isInteger(parsedValue)) {
                    onSemesterChange(parsedValue);
                  }
                }}
              >
                <SelectTrigger
                  className="relative h-11 w-full rounded-xl px-3.5 text-sm focus-visible:border-primary/55 focus-visible:ring-0"
                  onFocus={() => setFocusedField("semester")}
                  onBlur={() => setFocusedField(null)}
                >
                  <SelectValue>{`Semester ${semester}`}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, index) => {
                    const value = index + 1;
                    return (
                      <SelectItem key={value} value={String(value)}>
                        {`Semester ${value}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <IconFolderHeart className="size-4 text-primary" />
                Personal Repository
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                A private space for your own custom folders, notes, and collected references.
                You can toggle this any time in Settings.
              </p>
            </div>
            <Switch
              checked={personalRepositoryEnabled}
              onCheckedChange={onPersonalRepositoryChange}
              aria-label="Enable Personal Repository"
            />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-auto flex items-center justify-between gap-2">
        <PressableButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="rounded-xl"
        >
          Back
        </PressableButton>
        <PressableButton
          type="button"
          size="sm"
          onClick={onContinue}
          className="rounded-xl"
        >
          Finish Setup
        </PressableButton>
      </motion.div>
    </motion.div>
  );
}
