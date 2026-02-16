/**
 * Runtime command context representing the user's current academic location and affinity signals.
 */
export interface CommandContext {
  departmentId: string;
  semesterId: string;
  folderId?: string;
  pinnedIds: string[];
  recentIds: string[];
}
