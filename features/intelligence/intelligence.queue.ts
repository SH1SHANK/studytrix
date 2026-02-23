interface IdleDeadlineLike {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

type IdleCallbackHandle = number;

type IdleCallbackFunction = (deadline: IdleDeadlineLike) => void;

type IdleRequestOptions = {
  timeout?: number;
};

export type IntelligenceJobType = "EMBED" | "OCR";

export type IntelligenceJob<
  TType extends IntelligenceJobType = IntelligenceJobType,
  TPayload = unknown,
> = {
  type: TType;
  payload: TPayload;
  /** Timestamp when the job was added to the queue (for starvation tracking). */
  enqueuedAt?: number;
};

function hasIdleCallback(): boolean {
  return typeof window !== "undefined" && typeof window.requestIdleCallback === "function";
}

function requestIdle(callback: IdleCallbackFunction, options?: IdleRequestOptions): IdleCallbackHandle {
  if (hasIdleCallback()) {
    return window.requestIdleCallback(callback as IdleRequestCallback, options);
  }

  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 0,
    });
  }, 100);
}

function cancelIdle(handle: IdleCallbackHandle): void {
  if (hasIdleCallback()) {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
}

export async function processInIdleChunks<T>(params: {
  items: readonly T[];
  chunkSize: number;
  timeoutMs?: number;
  onChunk: (chunk: readonly T[], index: number) => Promise<void> | void;
}): Promise<void> {
  const { items, chunkSize, onChunk, timeoutMs = 250 } = params;

  if (items.length === 0) {
    return;
  }

  const size = Math.max(1, Math.floor(chunkSize));

  await new Promise<void>((resolve, reject) => {
    let chunkIndex = 0;
    let offset = 0;
    let isCanceled = false;
    let idleHandle = -1;

    const schedule = () => {
      idleHandle = requestIdle(run, { timeout: timeoutMs });
    };

    const run = async () => {
      if (isCanceled) {
        return;
      }

      const next = items.slice(offset, offset + size);
      offset += next.length;

      try {
        await onChunk(next, chunkIndex);
      } catch (error) {
        isCanceled = true;
        if (idleHandle >= 0) {
          cancelIdle(idleHandle);
        }
        reject(error);
        return;
      }

      chunkIndex += 1;

      if (offset >= items.length) {
        resolve();
        return;
      }

      schedule();
    };

    schedule();
  });
}

function getJobPriority(type: IntelligenceJobType): number {
  if (type === "EMBED") {
    return 0;
  }

  return 1;
}

export function sortIntelligenceJobsByPriority<TJob extends IntelligenceJob>(
  jobs: readonly TJob[],
): TJob[] {
  const now = Date.now();
  const STARVATION_MS = 60_000;

  return [...jobs].sort((left, right) => {
    let leftPrio = getJobPriority(left.type);
    let rightPrio = getJobPriority(right.type);

    // Promote starved OCR jobs to EMBED priority so they are not indefinitely
    // blocked by a continuous stream of EMBED work.
    if (left.type === "OCR" && typeof left.enqueuedAt === "number" && now - left.enqueuedAt > STARVATION_MS) {
      leftPrio = 0;
    }
    if (right.type === "OCR" && typeof right.enqueuedAt === "number" && now - right.enqueuedAt > STARVATION_MS) {
      rightPrio = 0;
    }

    return leftPrio - rightPrio;
  });
}

export async function runIntelligenceJobs<TJob extends IntelligenceJob>(params: {
  jobs: readonly TJob[];
  onJob: (job: TJob, index: number) => Promise<void> | void;
  fileIdExtractor?: (job: TJob) => string;
}): Promise<void> {
  const deduplicated = params.fileIdExtractor
    ? deduplicateIntelligenceJobs(params.jobs, params.fileIdExtractor)
    : [...params.jobs];
  const ordered = sortIntelligenceJobsByPriority(deduplicated);
  for (let index = 0; index < ordered.length; index += 1) {
    await params.onJob(ordered[index], index);
  }
}

async function batteryAllowsBackgroundJobs(): Promise<boolean> {
  const runtimeNavigator = navigator as Navigator & {
    getBattery?: () => Promise<{ level: number; charging: boolean }>;
  };

  if (typeof runtimeNavigator.getBattery !== "function") {
    return true;
  }

  try {
    const battery = await runtimeNavigator.getBattery();
    if (battery.level < 0.2 && battery.charging === false) {
      return false;
    }
  } catch {
    return true;
  }

  return true;
}

export async function shouldRunBackgroundIntelligenceJobs(): Promise<boolean> {
  const runtimeNavigator = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  if (runtimeNavigator.connection?.saveData === true) {
    return false;
  }

  const effectiveType = runtimeNavigator.connection?.effectiveType;
  if (effectiveType === "2g" || effectiveType === "slow-2g") {
    return false;
  }

  return batteryAllowsBackgroundJobs();
}

/**
 * Deduplicates jobs by a `fileId` extractor and caps the queue at
 * `INTELLIGENCE_QUEUE_MAX_DEPTH` (500). Duplicate fileIds are skipped
 * rather than re-added.
 */
export function deduplicateIntelligenceJobs<TJob extends IntelligenceJob>(
  jobs: readonly TJob[],
  getFileId: (job: TJob) => string,
  maxDepth = 500,
): TJob[] {
  const seen = new Set<string>();
  const result: TJob[] = [];

  for (const job of jobs) {
    const id = getFileId(job);
    if (id && seen.has(id)) {
      continue;
    }

    if (id) {
      seen.add(id);
    }

    result.push(job);
    if (result.length >= maxDepth) {
      break;
    }
  }

  return result;
}
