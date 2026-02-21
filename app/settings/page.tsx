import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

export const metadata: Metadata = {
  title: "Settings",
  description:
    "Manage Studytrix preferences for profile, greeting behavior, storage, command experience, accessibility, and guide links.",
  alternates: {
    canonical: "/settings",
  },
};

export default function SettingsPage() {
  return (
    <AppShell headerTitle="Settings" hideHeaderFilters={true}>
      <div className="px-4 pt-4 pb-8 sm:px-5 sm:pt-5">
        <SettingsLayout />
      </div>
    </AppShell>
  );
}
