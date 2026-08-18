import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { RecentFilesView } from "@/features/file/ui/RecentFilesView";

export const metadata: Metadata = {
  title: "Recent · Studytrix",
  description: "Quickly access your recently opened study materials and documents.",
  alternates: {
    canonical: "/recent",
  },
};

export default function RecentPage() {
  return (
    <AppShell showHeader={true} headerTitle="Recent Materials">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <RecentFilesView />
      </div>
    </AppShell>
  );
}
