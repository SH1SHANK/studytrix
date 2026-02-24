"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEPARTMENT_MAP, getDepartmentName } from "@/lib/academic";

type AcademicContextValue = {
  department: string; // Department ID (e.g. "ME")
  departmentName: string; // Full name (e.g. "Mechanical Engineering")
  semester: number; // Semester number (e.g. 4)
  semesterLabel: string; // Display label (e.g. "Semester 4")
  setDepartment: (id: string) => void;
  setSemester: (sem: number) => void;
};

const AcademicContext = createContext<AcademicContextValue | null>(null);

type AcademicProviderProps = {
  children: React.ReactNode;
};

const ACADEMIC_CONTEXT_STORAGE_KEY = "studytrix_academic_context";
const DEFAULT_DEPARTMENT = "ME";
const DEFAULT_SEMESTER = 4;

type StoredAcademicContext = {
  department?: unknown;
  semester?: unknown;
};

function isValidDepartment(value: unknown): value is string {
  return typeof value === "string" && value.toUpperCase() in DEPARTMENT_MAP;
}

function resolveDepartment(value: unknown): string {
  if (!isValidDepartment(value)) {
    return DEFAULT_DEPARTMENT;
  }

  return value.toUpperCase();
}

function resolveSemester(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return DEFAULT_SEMESTER;
  }

  if (value < 1 || value > 8) {
    return DEFAULT_SEMESTER;
  }

  return value;
}

export function AcademicProvider({ children }: AcademicProviderProps) {
  const [department, setDepartmentState] = useState(DEFAULT_DEPARTMENT);
  const [semester, setSemesterState] = useState(DEFAULT_SEMESTER);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setHydrated(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(ACADEMIC_CONTEXT_STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as StoredAcademicContext;
      setDepartmentState(resolveDepartment(parsed.department));
      setSemesterState(resolveSemester(parsed.semester));
    } catch {
      setDepartmentState(DEFAULT_DEPARTMENT);
      setSemesterState(DEFAULT_SEMESTER);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        ACADEMIC_CONTEXT_STORAGE_KEY,
        JSON.stringify({ department, semester }),
      );
    } catch {
      // Ignore storage failures and keep runtime state in memory.
    }
  }, [department, hydrated, semester]);

  const setDepartment = (nextDepartment: string) => {
    setDepartmentState(resolveDepartment(nextDepartment));
  };

  const setSemester = (nextSemester: number) => {
    setSemesterState(resolveSemester(nextSemester));
  };

  const value = useMemo(
    () => ({
      department,
      departmentName: getDepartmentName(department),
      semester,
      semesterLabel: `Semester ${semester}`,
      setDepartment,
      setSemester,
    }),
    [department, semester],
  );

  return (
    <AcademicContext.Provider value={value}>
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademicContext() {
  const context = useContext(AcademicContext);

  if (!context) {
    throw new Error("useAcademicContext must be used within AcademicProvider.");
  }

  return context;
}
