export const DUPLICATE_THRESHOLD = 0.92;

function cosineSimilarity(left: Float32Array, right: Float32Array): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) {
    return 0;
  }

  let dot = 0;
  let leftMag = 0;
  let rightMag = 0;

  for (let index = 0; index < length; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;
    dot += l * r;
    leftMag += l * l;
    rightMag += r * r;
  }

  if (leftMag <= 0 || rightMag <= 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMag) * Math.sqrt(rightMag));
}

/**
 * Finds duplicate file pairs by pairwise cosine similarity.
 *
 * The outer loop is broken into chunks of 100 files with a `setTimeout(0)` yield
 * between chunks so the worker's message loop can still process queries.
 *
 * Pairs are deduplicated: `(A, B)` and `(B, A)` are stored as one entry with
 * the lexicographically smaller ID first.
 */
export async function findDuplicates(
  index: Map<string, { vector: Float32Array }>,
): Promise<Array<{ fileIdA: string; fileIdB: string; similarity: number }>> {
  const entries = Array.from(index.entries());
  const seen = new Set<string>();
  const duplicates: Array<{ fileIdA: string; fileIdB: string; similarity: number }> = [];

  const CHUNK_SIZE = 100;

  for (let chunkStart = 0; chunkStart < entries.length; chunkStart += CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, entries.length);

    for (let leftIndex = chunkStart; leftIndex < chunkEnd; leftIndex += 1) {
      const [leftId, leftEntry] = entries[leftIndex];

      for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
        const [rightId, rightEntry] = entries[rightIndex];
        const similarity = cosineSimilarity(leftEntry.vector, rightEntry.vector);

        if (similarity >= DUPLICATE_THRESHOLD) {
          // Deduplicate: always store with lexicographically smaller ID first.
          const [fileIdA, fileIdB] = [leftId, rightId].sort();
          const pairKey = `${fileIdA}|${fileIdB}`;

          if (!seen.has(pairKey)) {
            seen.add(pairKey);
            duplicates.push({
              fileIdA,
              fileIdB,
              similarity,
            });
          }
        }
      }
    }

    // Yield to the worker's message loop between chunks so incoming queries
    // are not blocked during duplicate detection on large indices.
    if (chunkEnd < entries.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  return duplicates;
}
