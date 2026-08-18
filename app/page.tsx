import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { WorkspaceGrid } from "@/features/workspace/ui/WorkspaceGrid";

export const metadata: Metadata = {
  title: "Workspaces",
  description:
    "Open your Studytrix workspace to browse course folders, lectures, and study materials.",
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return (
    <AppShell showHeader={true}>
      <WorkspaceGrid />
    </AppShell>
  );
}
