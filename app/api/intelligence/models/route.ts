import "server-only";

import { NextResponse } from "next/server";

import fallbackCatalog from "@/data/intelligence-model-catalog.json";
import { normalizeModelCatalog } from "@/features/intelligence/intelligence.model-selector";

export const runtime = "nodejs";

const REMOTE_CATALOG_URL = process.env.INTELLIGENCE_MODEL_CATALOG_URL?.trim() || null;
const REMOTE_TIMEOUT_MS = 1800;

async function fetchRemoteCatalog(): Promise<unknown> {
  if (!REMOTE_CATALOG_URL) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REMOTE_TIMEOUT_MS);

  try {
    const response = await fetch(REMOTE_CATALOG_URL, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(): Promise<NextResponse> {
  const remote = await fetchRemoteCatalog();
  const normalizedRemote = remote ? normalizeModelCatalog(remote) : null;
  const normalizedFallback = normalizeModelCatalog(fallbackCatalog);

  if (!normalizedRemote && !normalizedFallback) {
    return NextResponse.json(
      {
        error: "No valid model catalog available",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
        },
      },
    );
  }

  const catalog = normalizedRemote ?? normalizedFallback;

  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, max-age=120, stale-while-revalidate=900",
    },
  });
}
