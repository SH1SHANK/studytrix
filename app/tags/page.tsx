import { AppShell } from "@/components/layout/AppShell";
import { TagManagerPanel } from "@/components/tags/TagManagerPanel";

export default function TagsPage() {
  return (
    <AppShell headerTitle="Manage Tags" hideHeaderFilters={true}>
      <div className="px-4 py-5 sm:px-5">
        <TagManagerPanel />
      </div>
    </AppShell>
  );
}
