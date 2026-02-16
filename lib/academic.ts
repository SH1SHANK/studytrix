export const DEPARTMENT_MAP: Record<string, string> = {
  ME: "Mechanical Engineering",
  CS: "Computer Science & Engineering",
  CE: "Civil Engineering",
  EC: "Electronics & Communication",
  EE: "Electrical Engineering",
  IT: "Information Technology",
  CH: "Chemical Engineering",
  BT: "Biotechnology",
  MT: "Metallurgical Engineering",
  AE: "Aerospace Engineering",
};

export function getDepartmentName(id: string): string {
  return DEPARTMENT_MAP[id.toUpperCase()] ?? id;
}
