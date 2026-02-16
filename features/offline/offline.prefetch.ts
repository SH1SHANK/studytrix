import { getFile } from "./offline.db";
import type { DownloadTask } from "./offline.types";

const PREFETCH_COUNT = 3;
const PREFETCH_BASE_PRIORITY = -100;

export function autoPrefetch(
  currentFileId: string,
  siblingFileIds: string[],
  enqueue: (task: DownloadTask) => void,
): void {
  void (async () => {
    const uniqueSiblings = Array.from(new Set(siblingFileIds));
    const currentIndex = uniqueSiblings.indexOf(currentFileId);

    if (currentIndex === -1) {
      return;
    }

    const candidates = uniqueSiblings.slice(
      currentIndex + 1,
      currentIndex + 1 + PREFETCH_COUNT,
    );

    for (let i = 0; i < candidates.length; i += 1) {
      const fileId = candidates[i];

      const cached = await getFile(fileId);
      if (cached) {
        continue;
      }

      enqueue({
        fileId,
        priority: PREFETCH_BASE_PRIORITY - i,
      });
    }
  })();
}
