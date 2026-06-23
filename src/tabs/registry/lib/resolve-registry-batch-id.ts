import { getUnearthApiBaseUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import { NEW_BATCH_DROPDOWN_VALUE } from "@/lib/garbo-batch-types";

function registryUrl(path: string): string {
  const base = getUnearthApiBaseUrl().replace(/\/+$/, "");
  const segment = path.replace(/^\//, "");
  return `${base}/${segment}`;
}

/** Resolve registry batch UI state to a Garbo `Batch.id` via Unearth API. */
export async function resolveRegistryBatchId(opts: {
  batchDropdownChoice: string;
  customBatchName: string;
}): Promise<string | undefined> {
  const { batchDropdownChoice, customBatchName } = opts;
  if (!batchDropdownChoice) return undefined;
  if (batchDropdownChoice === NEW_BATCH_DROPDOWN_VALUE) {
    const name = customBatchName.trim();
    if (!name) return undefined;
    const res = await garboAuthFetch(registryUrl("reports/registry/batches"), {
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
