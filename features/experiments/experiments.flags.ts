import { useSettingsStore } from "@/features/settings/settings.store";

export type FeatureReleaseChannel = "stable" | "beta" | "experimental";

export function resolveReleaseChannelFromVersionTag(
  versionTag: string | null | undefined,
): FeatureReleaseChannel {
  const normalized = versionTag?.trim().toLowerCase() ?? "";

  if (!normalized) {
    return "stable";
  }

  if (normalized.includes("experimental")) {
    return "experimental";
  }

  if (normalized.includes("beta")) {
    return "beta";
  }

  return "stable";
}

export function isReleaseChannelOptInRequired(channel: FeatureReleaseChannel): boolean {
  return channel === "beta" || channel === "experimental";
}

export function isExperimentalFeatureOptedIn(): boolean {
  return useSettingsStore.getState().values.experimental_features_opt_in === true;
}

export function isVersionTaggedFeatureEnabled(
  versionTag: string | null | undefined,
  experimentalOptIn: boolean = isExperimentalFeatureOptedIn(),
): boolean {
  const channel = resolveReleaseChannelFromVersionTag(versionTag);

  if (!isReleaseChannelOptInRequired(channel)) {
    return true;
  }

  return experimentalOptIn;
}
