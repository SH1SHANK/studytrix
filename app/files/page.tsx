import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AllFilesView } from "@/features/file/ui/AllFilesView";

export const metadata: Metadata = {
  title: "All Files · Studytrix",
  description: "Browse all indexed files and documents across your study library.",
  alternates: {
    canonical: "/files",
  },
};

export default function AllFilesPage() {
  return (
    <AppShell showHeader={true} headerTitle="All Study Materials">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <AllFilesView />
      </div>
    </AppShell>
  );
}
