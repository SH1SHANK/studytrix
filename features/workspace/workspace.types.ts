export interface DriveWorkspace {
  id: string; // Stable application UUID
  driveFolderId: string; // Google Drive folder ID
  name: string; // User-defined or auto-resolved name
  description?: string | null;
  category?: string | null; // e.g. "Semester 4", "GATE Prep", "Computer Science"
  color?: string | null; // Card accent color identifier
  pinned: boolean;
  itemCount?: number | null;
  createdAt: number;
  updatedAt: number;
}

export type WorkspaceSortKey = "recent" | "name" | "category";

export interface WorkspaceState {
  workspaces: DriveWorkspace[];
  activeCategory: string | null;
  sortKey: WorkspaceSortKey;
  hydrated: boolean;
  addWorkspace: (workspace: Omit<DriveWorkspace, "id" | "createdAt" | "updatedAt">) => DriveWorkspace;
  updateWorkspace: (id: string, updates: Partial<Omit<DriveWorkspace, "id" | "createdAt">>) => void;
  deleteWorkspace: (id: string) => void;
  togglePinWorkspace: (id: string) => void;
  setSortKey: (sort: WorkspaceSortKey) => void;
  setActiveCategory: (category: string | null) => void;
  importWorkspaces: (workspaces: DriveWorkspace[]) => void;
  clearAllWorkspaces: () => void;
}

export interface DriveResolveResponse {
  folderId: string;
  name: string;
  itemCount?: number;
  accessible: boolean;
  error?: string;
}
