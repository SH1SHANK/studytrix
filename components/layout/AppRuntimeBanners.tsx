"use client";

import { ConnectivityBanner } from "@/features/offline/ui/ConnectivityBanner";
import { VersionUpdateBanner } from "@/features/changelog/ui/VersionUpdateBanner";
import { useSetting } from "@/ui/hooks/useSettings";

export function AppRuntimeBanners() {
  const [showConnectivityBanner] = useSetting("show_connectivity_banner");
  const [showVersionUpdateBanner] = useSetting("show_version_update_banner");

  return (
    <>
      {showConnectivityBanner !== false ? <ConnectivityBanner /> : null}
      {showVersionUpdateBanner !== false ? <VersionUpdateBanner /> : null}
    </>
  );
}
