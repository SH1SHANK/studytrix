export const APP_VERSION = "0.9.1";
export const APP_VERSION_DISMISS_KEY = "studytrix.version.dismissed.v1";
export const CHANGELOG_ROUTE = "/changelog";

export function formatVersionLabel(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}
