/**
 * Upload-tab constants: API endpoints and batch dropdown value.
 */
import { getPipelineUrl } from "@/config/api-env";

export const PARSE_PDF_API_ENDPOINT = getPipelineUrl("/queues/parsePdf");
export const PARSE_PDF_UPLOAD_ENDPOINT = getPipelineUrl(
  "/queues/parsePdf/upload",
);
