const OFFLINE_V2_FLAG_KEY = "studytrix.offline_v2_enabled";
const OFFLINE_V3_FLAG_KEY = "studytrix.offline_v3_enabled";
const OFFLINE_V3_SW_FLAG_KEY = "studytrix.offline_v3_sw_enabled";
const OFFLINE_FLAGS_EVENT = "studytrix:offline-flags-changed";

type OfflineFlagKey =
  | typeof OFFLINE_V2_FLAG_KEY
  | typeof OFFLINE_V3_FLAG_KEY
  | typeof OFFLINE_V3_SW_FLAG_KEY;

function readFlag(
  key: string,
  defaults: {
    server: boolean;
    production: boolean;
    development: boolean;
  },
): boolean {
  if (typeof window === "undefined") {
    return defaults.server;
  }

  const override = window.localStorage.getItem(key);
  if (override === "0") {
    return false;
  }

  if (override === "1") {
    return true;
  }

  return process.env.NODE_ENV === "production"
    ? defaults.production
    : defaults.development;
}

export function isOfflineV2Enabled(): boolean {
  return readFlag(OFFLINE_V2_FLAG_KEY, {
    server: true,
    production: true,
    development: true,
  });
}

export function isOfflineV3Enabled(): boolean {
  return readFlag(OFFLINE_V3_FLAG_KEY, {
    server: true,
    production: true,
    development: true,
  });
}

export function isOfflineV3SwEnabled(): boolean {
  if (!isOfflineV3Enabled()) {
    return false;
  }

  return readFlag(OFFLINE_V3_SW_FLAG_KEY, {
    server: true,
    production: true,
    development: true,
  });
}

export function getOfflineFlagOverride(key: OfflineFlagKey): "0" | "1" | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(key);
  if (value === "0" || value === "1") {
    return value;
  }

  return null;
}

export function setOfflineFlagOverride(key: OfflineFlagKey, enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(OFFLINE_FLAGS_EVENT));
}

export function clearOfflineFlagOverride(key: OfflineFlagKey): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent(OFFLINE_FLAGS_EVENT));
}

export {
  OFFLINE_FLAGS_EVENT,
  OFFLINE_V2_FLAG_KEY,
  OFFLINE_V3_FLAG_KEY,
  OFFLINE_V3_SW_FLAG_KEY,
};
