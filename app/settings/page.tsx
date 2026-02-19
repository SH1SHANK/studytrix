import { AppShell } from "@/components/layout/AppShell";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="px-4 pt-4 pb-8 sm:px-5 sm:pt-5">
        <SettingsLayout />
      </div>
    </AppShell>
  );
}
