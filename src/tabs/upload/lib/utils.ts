/**
 * Upload-tab constants: API endpoints and batch dropdown value.
 */
import { getPipelineUrl } from "@/config/api-env";

export const PARSE_PDF_API_ENDPOINT = getPipelineUrl("/queues/parsePdf");
export const PARSE_PDF_UPLOAD_ENDPOINT = getPipelineUrl("/queues/parsePdf/upload");

/** Value for "new batch" in the batch dropdown; when selected, customBatchName is used. */
export const NEW_BATCH_DROPDOWN_VALUE = "__new__";
