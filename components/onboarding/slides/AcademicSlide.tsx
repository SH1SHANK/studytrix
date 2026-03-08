"use client";

import { useMemo } from "react";
import { IconInfoCircle, IconRotate } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { AnimatedSelect } from "@/components/onboarding/shared/AnimatedSelect";
import { SkeletonCard } from "@/components/onboarding/shared/SkeletonCard";
import { SkeletonRow } from "@/components/onboarding/shared/SkeletonRow";
import {
  AnimatedSlideIcon,
  SlideContainer,
  slideItemVariants,
} from "@/components/onboarding/shared/SlideContainer";
import { WordReveal } from "@/components/onboarding/shared/WordReveal";
import { IconSchool } from "@tabler/icons-react";

type CatalogIndexEntry = {
  id: string;
  name: string;
  availableSemesters: number[];
};

type AcademicSlideProps = {
  ready: boolean;
  departments: CatalogIndexEntry[];
  department: string;
  semester: number;
  loading: boolean;
  error: string | null;
  onDepartmentChange: (value: string) => void;
  onSemesterChange: (value: number) => void;
  onRetry: () => void;
  departmentSuccessTick: number;
  semesterSuccessTick: number;
};

export function AcademicSlide({
  ready,
  departments,
  department,
  semester,
  loading,
  error,
  onDepartmentChange,
  onSemesterChange,
  onRetry,
  departmentSuccessTick,
  semesterSuccessTick,
}: AcademicSlideProps) {
  const activeDepartment = useMemo(
    () => departments.find((entry) => entry.id === department) ?? null,
    [department, departments],
  );

  const departmentOptions = useMemo(
    () => departments.map((entry) => ({ value: entry.id, label: entry.name })),
    [departments],
  );

  const semesterOptions = useMemo(
    () => (activeDepartment?.availableSemesters ?? []).map((value) => ({
      value: String(value),
      label: `Semester ${value}`,
    })),
    [activeDepartment],
  );

  return (
    <SlideContainer ready={ready} className="flex flex-col">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center gap-5 py-4">
        <motion.p
          variants={slideItemVariants}
          className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Academic Setup
        </motion.p>

        <motion.div variants={slideItemVariants}>
          <AnimatedSlideIcon start={ready} className="inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
            <IconSchool className="size-7" />
          </AnimatedSlideIcon>
        </motion.div>

        <motion.h2
          variants={slideItemVariants}
          className="font-heading text-[clamp(1.9rem,4.6vw,3rem)] font-semibold leading-tight tracking-tight text-foreground"
        >
          <WordReveal text="Set your default academic context" start={ready} />
        </motion.h2>

        <motion.p variants={slideItemVariants} className="max-w-2xl text-sm text-muted-foreground">
          This sets your Global Repository defaults. You can switch department or semester anytime.
        </motion.p>

        <motion.div variants={slideItemVariants} className="space-y-4 rounded-3xl border border-border/70 bg-card/70 p-4 sm:p-5">
          {loading && departments.length === 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="academic-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <SkeletonCard />
                <SkeletonRow />
              </motion.div>
            </AnimatePresence>
          ) : null}

          {!loading && departments.length === 0 ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <IconInfoCircle className="size-4 text-rose-500" />
                Academic data unavailable
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Could not load department-semester mappings. Retry to continue onboarding.
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/40"
              >
                <IconRotate className="size-3.5" />
                Retry
              </button>
              {error ? <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
            </div>
          ) : null}

          {departments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <AnimatedSelect
                id="onboarding-department"
                label="Department"
                value={department}
                options={departmentOptions}
                onChange={onDepartmentChange}
                placeholder="Choose department"
                successTick={departmentSuccessTick}
              />

              <AnimatedSelect
                id="onboarding-semester"
                label="Current Semester"
                value={String(semester)}
                options={semesterOptions}
                onChange={(value) => {
                  const parsed = Number.parseInt(value, 10);
                  if (Number.isInteger(parsed)) {
                    onSemesterChange(parsed);
                  }
                }}
                placeholder="Choose semester"
                successTick={semesterSuccessTick}
              />
            </div>
          ) : null}

          {error && departments.length > 0 ? <p className="text-xs text-destructive">{error}</p> : null}
        </motion.div>
      </div>
    </SlideContainer>
  );
}
