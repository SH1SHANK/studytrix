"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SettingRowShell } from "./SettingCardShell";
import { useSetting } from "@/ui/hooks/useSettings";
import { isVersionTaggedFeatureEnabled } from "@/features/experiments/experiments.flags";
import {
  clearOfflineFlagOverride,
  getOfflineFlagOverride,
  isOfflineV3Enabled,
  isOfflineV3SwEnabled,
  OFFLINE_FLAGS_EVENT,
  OFFLINE_V3_FLAG_KEY,
  OFFLINE_V3_SW_FLAG_KEY,
  setOfflineFlagOverride,
} from "@/features/offline/offline.flags";

const INTERNAL_DEBUG_KEY = "studytrix.internal_debug";
const OFFLINE_DEBUG_PANEL_VERSION_TAG = "v0.9.0-experimental";

type PanelState = {
  show: boolean;
  v3Enabled: boolean;
  v3SwEnabled: boolean;
  v3Override: "0" | "1" | null;
  v3SwOverride: "0" | "1" | null;
};

function readPanelState(): PanelState {
  if (typeof window === "undefined") {
    return {
      show: false,
      v3Enabled: false,
      v3SwEnabled: false,
      v3Override: null,
      v3SwOverride: null,
    };
  }

  const debugOverride = window.localStorage.getItem(INTERNAL_DEBUG_KEY) === "1";
  const show = process.env.NODE_ENV !== "production" || debugOverride;

  return {
    show,
    v3Enabled: isOfflineV3Enabled(),
    v3SwEnabled: isOfflineV3SwEnabled(),
    v3Override: getOfflineFlagOverride(OFFLINE_V3_FLAG_KEY),
    v3SwOverride: getOfflineFlagOverride(OFFLINE_V3_SW_FLAG_KEY),
  };
}

function formatOverride(value: "0" | "1" | null): string {
  if (value === null) {
    return "default";
  }

  return value === "1" ? "forced on" : "forced off";
}

export function OfflineDebugPanel() {
  const [state, setState] = useState<PanelState>(() => readPanelState());
  const [experimentalFeaturesOptIn] = useSetting("experimental_features_opt_in");
  const isPanelEnabled = isVersionTaggedFeatureEnabled(
    OFFLINE_DEBUG_PANEL_VERSION_TAG,
    experimentalFeaturesOptIn === true,
  );

  const syncState = useCallback(() => {
    setState(readPanelState());
  }, []);

  useEffect(() => {
    syncState();

    const onStorage = () => {
      syncState();
    };
    const onFlags = () => {
      syncState();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(OFFLINE_FLAGS_EVENT, onFlags);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(OFFLINE_FLAGS_EVENT, onFlags);
    };
  }, [syncState]);

  if (!state.show || !isPanelEnabled) {
    return null;
  }

  return (
    <section aria-labelledby="settings-category-experimental-features" className="space-y-2 mt-8">
      <header className="px-1 sm:px-4 flex items-center justify-between">
        <h2
          id="settings-category-experimental-features"
          className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase"
        >
          Experimental Features
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            clearOfflineFlagOverride(OFFLINE_V3_FLAG_KEY);
            clearOfflineFlagOverride(OFFLINE_V3_SW_FLAG_KEY);
            syncState();
          }}
          className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
        >
          Reset Defaults
        </Button>
      </header>

      <Card className="overflow-hidden p-0 rounded-xl border border-border/40 bg-card shadow-sm">
        <CardContent className="p-0 flex flex-col">
          <SettingRowShell
            label="Offline v3 Core"
            description={`Override: ${formatOverride(state.v3Override)}`}
            icon={
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>
              </div>
            }
            trailing={
              <Switch
                id="offline-v3-core-toggle"
                checked={state.v3Enabled}
                onCheckedChange={(checked) => {
                  setOfflineFlagOverride(OFFLINE_V3_FLAG_KEY, checked);
                  if (!checked) {
                    setOfflineFlagOverride(OFFLINE_V3_SW_FLAG_KEY, false);
                  }
                  syncState();
                }}
                className="mt-1"
              />
            }
          />
          <SettingRowShell
            label="Offline v3 Service Worker"
            description={`Override: ${formatOverride(state.v3SwOverride)}`}
            icon={
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
            }
            trailing={
              <Switch
                id="offline-v3-sw-toggle"
                checked={state.v3SwEnabled}
                disabled={!state.v3Enabled}
                onCheckedChange={(checked) => {
                  if (!state.v3Enabled) {
                    return;
                  }
                  setOfflineFlagOverride(OFFLINE_V3_SW_FLAG_KEY, checked);
                  syncState();
                }}
                className="mt-1"
              />
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}
