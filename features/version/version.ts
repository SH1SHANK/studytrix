export const APP_VERSION = "0.9.3-experimental";
export const APP_VERSION_DISMISS_KEY = "studytrix.version.dismissed.v2";
export const CHANGELOG_ROUTE = "/changelog";

export function formatVersionLabel(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}
