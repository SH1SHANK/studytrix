import { AppShell } from "@/components/layout/AppShell";
import { TagManagerPanel } from "@/components/tags/TagManagerPanel";

export default function TagsPage() {
  return (
    <AppShell>
      <div className="px-4 py-4">
        <TagManagerPanel />
      </div>
    </AppShell>
  );
}
