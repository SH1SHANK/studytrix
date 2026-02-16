"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { getDepartmentName } from "@/lib/academic";

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

export function AcademicProvider({ children }: AcademicProviderProps) {
  const [department, setDepartment] = useState("ME");
  const [semester, setSemester] = useState(4);

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
