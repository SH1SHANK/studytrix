"use client";

import {
  INTELLIGENCE_MODEL_CATALOG_ENDPOINT,
  INTELLIGENCE_QUERY_TIMEOUT_MS,
} from "./intelligence.constants";
import { getIntelligenceSnapshot, setIntelligenceSnapshot } from "./intelligence.db";
import { normalizeModelCatalog } from "./intelligence.model-selector";
import type {
  FileEntry,
  IntelligenceModelCatalog,
  SearchScope,
  IntelligenceWorkerAnyRequestEnvelope,
  IntelligenceWorkerAnyResponseEnvelope,
  IntelligenceWorkerEventMessage,
  IntelligenceWorkerRequestMap,
  IntelligenceWorkerResponseMap,
  IntelligenceWorkerStats,
} from "./intelligence.types";

interface QueryOptions {
  query: string;
  limit: number;
  scope: SearchScope;
  repoFilter?: "global" | "personal" | "both";
  timeoutMs?: number;
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `intelligence_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function buildIntelligenceSnapshotKey(scopeKey: string, modelId: string): string {
  return `${scopeKey.trim()}::${modelId.trim()}`;
}

export class IntelligenceClient {
  private worker: Worker | null = null;

  private readonly pending = new Map<string, PendingRequest>();

  private initializedModelId: string | null = null;

  private initializing = false;

  private boundOnMessage: ((event: MessageEvent<IntelligenceWorkerAnyResponseEnvelope | IntelligenceWorkerEventMessage>) => void) | null = null;

  private readonly eventListeners = new Set<(message: IntelligenceWorkerEventMessage) => void>();

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }

    const worker = new Worker(
      new URL("./intelligence.worker.ts", import.meta.url),
      { type: "module" },
    );

    this.boundOnMessage = (event: MessageEvent<IntelligenceWorkerAnyResponseEnvelope | IntelligenceWorkerEventMessage>) => {
      const payload = event.data;
      if (!payload) {
        return;
      }

      if (
        typeof payload === "object"
        && payload !== null
        && "type" in payload
        && !("requestId" in payload)
      ) {
        for (const listener of this.eventListeners) {
          listener(payload as IntelligenceWorkerEventMessage);
        }
        return;
      }

      if (typeof payload !== "object" || !("requestId" in payload) || typeof payload.requestId !== "string") {
        return;
      }

      const request = this.pending.get(payload.requestId);
      if (!request) {
        return;
      }

      this.pending.delete(payload.requestId);

      if (payload.ok) {
        request.resolve(payload.payload);
      } else {
        request.reject(new Error(payload.error));
      }
    };

    worker.addEventListener("message", this.boundOnMessage as EventListener);

    worker.addEventListener("error", (event) => {
      const message = event instanceof ErrorEvent && event.message
        ? event.message
        : "Intelligence worker crashed";
      for (const pending of this.pending.values()) {
        pending.reject(new Error(message));
      }
      this.pending.clear();
    });

    this.worker = worker;
    return worker;
  }

  private async request<T extends keyof IntelligenceWorkerRequestMap>(
    type: T,
    payload: IntelligenceWorkerRequestMap[T],
  ): Promise<IntelligenceWorkerResponseMap[T]> {
    const worker = this.ensureWorker();

    const requestId = createRequestId();
    const envelope: IntelligenceWorkerAnyRequestEnvelope = {
      requestId,
      type,
      payload,
    };

    const response = await new Promise<IntelligenceWorkerResponseMap[T]>((resolve, reject) => {
      this.pending.set(requestId, {
        resolve: (value) => resolve(value as IntelligenceWorkerResponseMap[T]),
        reject,
      });

      try {
        worker.postMessage(envelope);
      } catch (err) {
        this.pending.delete(requestId);
        reject(err instanceof Error ? err : new Error("Failed to post message to worker"));
      }
    });

    return response;
  }

  subscribeEvents(listener: (message: IntelligenceWorkerEventMessage) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  async init(params: {
    modelId?: string;
    snapshotKey: string;
  }): Promise<IntelligenceWorkerStats> {
    if (this.initializing) {
      return this.request("GET_STATS", undefined);
    }
    if (this.worker && this.initializedModelId === (params.modelId ?? this.initializedModelId)) {
      return this.request("GET_STATS", undefined);
    }

    this.initializing = true;
    try {
      const snapshot = await getIntelligenceSnapshot(params.snapshotKey);
      const result = await this.request("INIT", {
        modelId: params.modelId,
        snapshot,
      });

      this.initializedModelId = result.modelId;
      return result;
    } finally {
      this.initializing = false;
    }
  }

  async setModel(modelId: string): Promise<IntelligenceWorkerStats> {
    const result = await this.request("SET_MODEL", { modelId });
    this.initializedModelId = result.modelId;
    return result;
  }

  async indexFiles(params: {
    files: FileEntry[];
    snapshotKey?: string;
    signature?: string;
    onProgress?: (progress: { processed: number; total: number; currentFileName: string }) => void;
  }): Promise<IntelligenceWorkerStats> {
    if (params.files.length === 0) {
      params.onProgress?.({ processed: 0, total: 0, currentFileName: "" });
      return this.request("GET_STATS", undefined);
    }

    const unsubscribe = params.onProgress
      ? this.subscribeEvents((message) => {
        if (message.type !== "INDEX_PROGRESS") {
          return;
        }

        params.onProgress?.({
          processed: message.processed,
          total: message.total,
          currentFileName: message.currentFileName,
        });
      })
      : () => undefined;

    try {
      const result = await this.request("INDEX_FILES", {
        files: params.files,
        signature: params.signature,
      });

      if (params.snapshotKey) {
        const persistResult = await this.request("PERSIST", { key: params.snapshotKey });
        await setIntelligenceSnapshot(persistResult.snapshot);
      }

      return result;
    } finally {
      unsubscribe();
    }
  }

  async cancelIndexing(): Promise<boolean> {
    const result = await this.request("CANCEL_INDEXING", undefined);
    return result.cancelled;
  }

  async query(params: QueryOptions): Promise<IntelligenceWorkerResponseMap["QUERY"]> {
    const timeoutMs = typeof params.timeoutMs === "number"
      ? Math.max(100, Math.floor(params.timeoutMs))
      : INTELLIGENCE_QUERY_TIMEOUT_MS;

    const requestPromise = this.request("QUERY", {
      query: params.query,
      limit: params.limit,
      scope: params.scope,
      repoFilter: params.repoFilter,
    });

    const timeoutPromise = new Promise<IntelligenceWorkerResponseMap["QUERY"]>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Semantic query timeout"));
      }, timeoutMs);
    });

    return Promise.race([requestPromise, timeoutPromise]);
  }

  async getStats(): Promise<IntelligenceWorkerStats> {
    return this.request("GET_STATS", undefined);
  }

  async persist(snapshotKey: string): Promise<void> {
    const result = await this.request("PERSIST", { key: snapshotKey });
    await setIntelligenceSnapshot(result.snapshot);
  }

  async clearIndex(): Promise<IntelligenceWorkerStats> {
    return this.request("CLEAR_INDEX", {});
  }

  async clearModelCache(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames
        .filter((name) => name.includes("transformers-cache"))
        .map((name) => caches.delete(name));

      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Failed to clear model cache array buffers", error);
    }
  }

  dispose(): void {
    for (const pending of this.pending.values()) {
      pending.reject(new Error("Intelligence worker disposed"));
    }

    this.pending.clear();

    if (this.boundOnMessage && this.worker) {
      this.worker.removeEventListener("message", this.boundOnMessage as EventListener);
    }

    this.worker?.terminate();
    this.worker = null;
    this.boundOnMessage = null;
    this.initializedModelId = null;
  }
}

let sharedClient: IntelligenceClient | null = null;

export function getIntelligenceClient(): IntelligenceClient {
  if (!sharedClient) {
    sharedClient = new IntelligenceClient();
  }

  return sharedClient;
}

export async function fetchIntelligenceModelCatalog(
  signal?: AbortSignal,
): Promise<IntelligenceModelCatalog> {
  const response = await fetch(INTELLIGENCE_MODEL_CATALOG_ENDPOINT, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch model catalog (${response.status})`);
  }

  const payload = await response.json();
  const normalized = normalizeModelCatalog(payload);

  if (!normalized) {
    throw new Error("Invalid model catalog payload");
  }

  return normalized;
}
