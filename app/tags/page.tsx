import { AppShell } from "@/components/layout/AppShell";
import { CompactPageContainer } from "@/components/layout/CompactPageContainer";
import { TagManagerPanel } from "@/components/tags/TagManagerPanel";

export default function TagsPage() {
  return (
    <AppShell headerTitle="Manage Tags" hideHeaderFilters={true}>
      <CompactPageContainer
        regularClassName="px-4 py-5 sm:px-5"
        compactClassName="px-4 py-4 sm:px-5"
      >
        <TagManagerPanel />
      </CompactPageContainer>
    </AppShell>
  );
}
