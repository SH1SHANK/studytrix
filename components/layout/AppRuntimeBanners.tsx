"use client";

import { useEffect, useState } from "react";

import { ConnectivityBanner } from "@/features/offline/ui/ConnectivityBanner";
import { VersionUpdateBanner } from "@/features/changelog/ui/VersionUpdateBanner";
import { useSetting } from "@/ui/hooks/useSettings";

export function AppRuntimeBanners() {
  const [hasMounted, setHasMounted] = useState(false);
  const [showConnectivityBanner] = useSetting("show_connectivity_banner");
  const [showVersionUpdateBanner] = useSetting("show_version_update_banner");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return (
    <>
      {showConnectivityBanner !== false ? <ConnectivityBanner /> : null}
      {showVersionUpdateBanner !== false ? <VersionUpdateBanner /> : null}
    </>
  );
}
