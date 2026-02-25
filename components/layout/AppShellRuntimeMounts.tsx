"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

import { Toaster } from "@/components/ui/sonner";
import { useStorageLocationStore } from "@/features/offline/offline.storage-location.store";
import { useShareStore } from "@/features/share/share.store";

const ScopedCommandBar = dynamic(
  () => import("@/features/command/ui/ScopedCommandBar").then((mod) => mod.ScopedCommandBar),
  { ssr: false },
);

const ShareProgressDrawer = dynamic(
  () => import("@/features/share/ui/ShareProgressDrawer").then((mod) => mod.ShareProgressDrawer),
  { ssr: false },
);

const GlobalStorageSetupSheet = dynamic(
  () => import("@/features/offline/ui/StorageSetupSheet").then((mod) => mod.GlobalStorageSetupSheet),
  { ssr: false },
);

type AppShellRuntimeMountsProps = {
  commandPlaceholder?: string;
};

export function AppShellRuntimeMounts({ commandPlaceholder }: AppShellRuntimeMountsProps) {
  const shareOpen = useShareStore((state) => state.isOpen);
  const storageSetupOpen = useStorageLocationStore((state) => state.isSetupSheetOpen);

  return (
    <>
      <Suspense fallback={null}>
        <ScopedCommandBar placeholder={commandPlaceholder} />
      </Suspense>
      {shareOpen ? <ShareProgressDrawer /> : null}
      <Toaster />
      {storageSetupOpen ? <GlobalStorageSetupSheet /> : null}
    </>
  );
}
