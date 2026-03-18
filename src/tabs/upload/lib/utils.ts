/**
 * Upload-tab constants: API endpoints and batch dropdown value.
 */
import { getGarboApiBaseUrl, getPipelineUrl } from "@/config/api-env";

export const PARSE_PDF_API_ENDPOINT = getPipelineUrl("/queues/parsePdf");

/** Garbo endpoint to persist reports discovered via uploads into the reports table. */
export const GARBO_SAVE_REPORTS_ENDPOINT = `${getGarboApiBaseUrl()}/reports/save-reports`;

/** Value for "new batch" in the batch dropdown; when selected, customBatchName is used. */
export const NEW_BATCH_DROPDOWN_VALUE = "__new__";
