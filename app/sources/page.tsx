import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { DriveSourcesPanel } from "@/features/drive/ui/DriveSourcesPanel";

export const metadata: Metadata = {
  title: "Drive Sources · Studytrix",
  description: "Manage connected Google Drive sources and sync settings.",
  alternates: {
    canonical: "/sources",
  },
};

export default function SourcesPage() {
  return (
    <AppShell showHeader={true} headerTitle="Google Drive Sources">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <DriveSourcesPanel />
      </div>
    </AppShell>
  );
}
