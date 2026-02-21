export const OFFLINE_LIBRARY_ROUTE = "/offline-library";
export const OFFLINE_LIBRARY_FALLBACK_ROUTE = "/offline-library.html";

export function isOfflineLibraryRoute(route: string): boolean {
  const normalized = route.trim().split("?")[0];
  return normalized === OFFLINE_LIBRARY_ROUTE || normalized === OFFLINE_LIBRARY_FALLBACK_ROUTE;
}

export function resolveOfflineLibraryRoute(route: string = OFFLINE_LIBRARY_ROUTE): string {
  const normalizedRoute = route.trim() || OFFLINE_LIBRARY_ROUTE;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const query = normalizedRoute.includes("?")
      ? normalizedRoute.slice(normalizedRoute.indexOf("?"))
      : "";
    return `${OFFLINE_LIBRARY_FALLBACK_ROUTE}${query}`;
  }
  return normalizedRoute;
}

export function navigateToOfflineLibrary(
  pushRoute?: (route: string) => void,
  route: string = OFFLINE_LIBRARY_ROUTE,
): void {
  const resolved = resolveOfflineLibraryRoute(route);
  if (resolved.startsWith(OFFLINE_LIBRARY_FALLBACK_ROUTE)) {
    if (typeof window !== "undefined") {
      window.location.assign(resolved);
    }
    return;
  }

  if (pushRoute) {
    pushRoute(resolved);
    return;
  }

  if (typeof window !== "undefined") {
    window.location.assign(resolved);
  }
}
