export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize < 1) throw new Error("chunkSize must be at least 1");
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/** Pack files into upload chunks bounded by count and total byte size. */
export function chunkFilesBySize(
  files: File[],
  maxFiles: number,
  maxBytes: number,
): File[][] {
  if (maxFiles < 1) throw new Error("maxFiles must be at least 1");
  if (maxBytes < 1) throw new Error("maxBytes must be at least 1");

  const chunks: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;

  for (const file of files) {
    const exceedsCount = current.length >= maxFiles;
    const exceedsBytes =
      current.length > 0 && currentBytes + file.size > maxBytes;

    if (exceedsCount || exceedsBytes) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }

    current.push(file);
    currentBytes += file.size;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

/** Run async work over items with a fixed concurrency limit. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}
