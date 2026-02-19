const FEATURE_FLAG_KEY = "studytrix.offline_v2_enabled";

export function isOfflineV2Enabled(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const override = window.localStorage.getItem(FEATURE_FLAG_KEY);
  if (override === "0") {
    return false;
  }

  if (override === "1") {
    return true;
  }

  return true;
}

export { FEATURE_FLAG_KEY as OFFLINE_V2_FLAG_KEY };
