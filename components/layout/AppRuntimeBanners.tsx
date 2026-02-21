"use client";

import { ConnectivityBanner } from "@/components/offline/ConnectivityBanner";
import { VersionUpdateBanner } from "@/components/changelog/VersionUpdateBanner";
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
