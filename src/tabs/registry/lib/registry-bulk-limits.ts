/** Max PDF size accepted by the Unearth upload-pdfs API (keep in sync with API PDF_MAX_BYTES). */
export const REGISTRY_PDF_MAX_BYTES = 100 * 1024 * 1024;

/** Max PDFs per multipart upload request (API multipart `files` limit is 20). */
export const REGISTRY_UPLOAD_CHUNK_SIZE = 15;

/** Max total bytes per upload chunk (stay under API ingress proxy-body-size). */
export const REGISTRY_UPLOAD_MAX_CHUNK_BYTES = 300 * 1024 * 1024;

/** Parallel upload-pdfs requests while adding many registry PDFs. */
export const REGISTRY_UPLOAD_CONCURRENCY = 2;

/** Registry rows per save-reports JSON request. */
export const REGISTRY_SAVE_CHUNK_SIZE = 50;

export const REGISTRY_PDF_MAX_MB = REGISTRY_PDF_MAX_BYTES / 1024 / 1024;
