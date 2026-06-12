import { getGarboQueueArchiveUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import { NEW_BATCH_DROPDOWN_VALUE } from "@/lib/garbo-batch-types";

/**
 * Resolves Upload/Registry batch UI state to a **Garbo `Batch.id`** for `job.data.batchId`
 * on the pipeline (opaque string; workers/archive resolve by id or legacy name).
 */
export async function resolvePipelineBatchId(opts: {
  batchDropdownChoice: string;
  customBatchName: string;
  /** Override batch API (e.g. stage Garbo queue-archive). */
  batchesApiUrl?: string;
}): Promise<string | undefined> {
  const { batchDropdownChoice, customBatchName, batchesApiUrl } = opts;
  const batchesUrl = batchesApiUrl ?? getGarboQueueArchiveUrl("/batches");
  if (!batchDropdownChoice) return undefined;
  if (batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE) {
    const name = customBatchName.trim();
    if (!name) return undefined;
    const res = await garboAuthFetch(batchesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchName: name }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { batch?: { id: string } };
    return data.batch?.id;
  }
  const id = batchDropdownChoice.trim();
  return id || undefined;
}
