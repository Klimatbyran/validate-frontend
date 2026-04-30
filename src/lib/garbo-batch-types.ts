/** One row from Garbo `Batch` (queue archive / upload picker). */
export type GarboBatchOption = {
  id: string;
  batchName: string;
};

/** Value for "new batch" in the batch dropdown; when selected, `customBatchName` is sent to Garbo POST /batches. */
export const NEW_BATCH_DROPDOWN_VALUE = "__new__";
