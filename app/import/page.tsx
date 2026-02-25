import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { ImportSharedFolderPageClient } from "@/features/custom-folders/ui/ImportSharedFolderPageClient";

type ImportPageProps = {
  searchParams: Promise<{
    fid?: string;
    ref?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Import Shared Folder",
  description: "Verify and add a shared Drive folder to your Personal Repository.",
};

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const query = await searchParams;
  const fid = typeof query.fid === "string" ? query.fid : null;

  return (
    <AppShell showHeader={false} commandPlaceholder="Search in Studytrix">
      <ImportSharedFolderPageClient fid={fid} />
    </AppShell>
  );
}
