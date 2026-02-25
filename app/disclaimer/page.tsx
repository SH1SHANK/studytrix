import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import {
  getLegalDocumentBySlug,
} from "@/features/legal/legal.documents";
import { LegalDocumentView } from "@/features/legal/ui/LegalDocumentView";

const document = getLegalDocumentBySlug("disclaimer");

export const metadata: Metadata = {
  title: document.title,
  description: document.description,
  alternates: {
    canonical: "/disclaimer",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DisclaimerPage() {
  return (
    <AppShell headerTitle="Legal" hideHeaderFilters={true}>
      <LegalDocumentView document={document} />
    </AppShell>
  );
}
