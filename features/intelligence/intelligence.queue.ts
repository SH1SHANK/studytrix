interface IdleDeadlineLike {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

type IdleCallbackHandle = number;

type IdleCallbackFunction = (deadline: IdleDeadlineLike) => void;

type IdleRequestOptions = {
  timeout?: number;
};

export type IntelligenceJobType = "EMBED";

export type IntelligenceJob<
  TType extends IntelligenceJobType = IntelligenceJobType,
  TPayload = unknown,
> = {
  type: TType;
  payload: TPayload;
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

export async function runIntelligenceJobs<TJob extends IntelligenceJob>(params: {
  jobs: readonly TJob[];
  onJob: (job: TJob, index: number) => Promise<void> | void;
  fileIdExtractor?: (job: TJob) => string;
}): Promise<void> {
  const coalesced = params.fileIdExtractor
    ? coalesceIntelligenceJobs(params.jobs, params.fileIdExtractor)
    : [...params.jobs];

  for (let index = 0; index < coalesced.length; index += 1) {
    await params.onJob(coalesced[index], index);
  }
}

/**
 * Coalesces jobs by `fileId` and caps queue depth.
 */
export function coalesceIntelligenceJobs<TJob extends IntelligenceJob>(
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
