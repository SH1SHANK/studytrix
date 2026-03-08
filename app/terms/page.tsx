import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import {
  getLegalDocumentBySlug,
} from "@/features/legal/legal.documents";
import { LegalDocumentView } from "@/features/legal/ui/LegalDocumentView";

const document = getLegalDocumentBySlug("terms");

export const metadata: Metadata = {
  title: document.title,
  description: document.description,
  alternates: {
    canonical: "/terms",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function TermsPage() {
  return (
    <AppShell headerTitle="Legal" hideHeaderFilters={true} contentWidth="compact">
      <LegalDocumentView document={document} />
    </AppShell>
  );
}
