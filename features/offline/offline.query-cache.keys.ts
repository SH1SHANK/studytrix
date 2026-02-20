export const QUERY_CACHE_KEYS = {
  catalogIndex: "catalog:index",
  catalogSemester: (department: string, semester: number): string =>
    `catalog:semester:${department.trim().toUpperCase()}:${semester}`,
  driveFolderPage: (folderId: string, pageToken?: string): string =>
    `drive:folder:${folderId.trim()}:${pageToken?.trim() || "root"}`,
  fileMetadata: (fileId: string): string => `file:metadata:${fileId.trim()}`,
  nestedDriveIndex: (
    department: string,
    semester: number | string,
    rootSignature: string,
  ): string =>
    `drive:nested-index:${department.trim().toUpperCase()}:${String(semester).trim()}:${rootSignature.trim()}`,
} as const;

export const QUERY_CACHE_PREFIXES = {
  catalogSemester: (department: string): string =>
    `catalog:semester:${department.trim().toUpperCase()}:`,
  driveFolder: (folderId: string): string => `drive:folder:${folderId.trim()}:`,
  nestedDriveIndex: (department: string, semester: number | string): string =>
    `drive:nested-index:${department.trim().toUpperCase()}:${String(semester).trim()}:`,
} as const;

export type NestedRootSignatureInput = {
  courseCode: string;
  folderId: string;
};

export function buildNestedRootSignature(
  roots: readonly NestedRootSignatureInput[],
): string {
  return [...roots]
    .map((root) => `${root.courseCode.trim().toUpperCase()}:${root.folderId.trim()}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}
