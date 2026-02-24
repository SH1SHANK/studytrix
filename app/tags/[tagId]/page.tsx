"use client";

import { use } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { TagFilesView } from "@/features/tags/ui/TagFilesView";

interface TagFilesPageProps {
  params: Promise<{ tagId: string }>;
}

export default function TagFilesPage({ params }: TagFilesPageProps) {
  const { tagId } = use(params);

  return (
    <AppShell headerTitle="Tag Files" hideHeaderFilters={true}>
      <div className="px-4 py-5 sm:px-5">
        <TagFilesView tagId={tagId} />
      </div>
    </AppShell>
  );
}
