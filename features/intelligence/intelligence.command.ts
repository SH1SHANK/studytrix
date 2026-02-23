import type { CommandItem } from "@/features/command/command.types";

import type { IntelligenceDocument, IntelligenceSearchHit } from "./intelligence.types";

export function buildSemanticDocuments(commands: readonly CommandItem[]): IntelligenceDocument[] {
  return commands.map((command) => {
    const payload = command.payload as Record<string, unknown> | undefined;
    const mimeType = typeof payload?.mimeType === "string"
      ? payload.mimeType
      : undefined;
    const fullPath = typeof payload?.fullPath === "string"
      ? payload.fullPath
      : command.subtitle;
    const payloadTags = Array.isArray(payload?.tags)
      ? payload.tags.filter((value): value is string => typeof value === "string")
      : [];

    return {
      id: command.id,
      entityId: command.entityId,
      fileId: typeof payload?.fileId === "string" ? payload.fileId : command.entityId,
      title: command.title,
      subtitle: command.subtitle,
      keywords: command.keywords,
      tags: payloadTags.length > 0 ? payloadTags : command.keywords,
      group: command.group,
      mimeType,
      fullPath,
    } satisfies IntelligenceDocument;
  });
}

function hashText(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function buildSemanticSignature(scopeKey: string, commandIds: readonly string[]): string {
  const sorted = [...commandIds].sort((left, right) => left.localeCompare(right));
  const payload = `${scopeKey}::${sorted.join("|")}`;
  return `${scopeKey}::${hashText(payload).toString(36)}::${sorted.length}`;
}

export function mapSemanticHitsById(hits: readonly IntelligenceSearchHit[]): Map<string, number> {
  const mapped = new Map<string, number>();

  for (const hit of hits) {
    if (typeof hit.id !== "string" || hit.id.trim().length === 0) {
      continue;
    }

    const safeScore = Number.isFinite(hit.score)
      ? Math.max(0, Math.min(1, hit.score))
      : 0;

    mapped.set(hit.id, safeScore);
  }

  return mapped;
}
