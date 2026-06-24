/** Max PDFs per multipart upload request (API multipart `files` limit is 20). */
export const REGISTRY_UPLOAD_CHUNK_SIZE = 15;

/** Parallel upload-pdfs requests while adding many registry PDFs. */
export const REGISTRY_UPLOAD_CONCURRENCY = 2;

/** Registry rows per save-reports JSON request. */
export const REGISTRY_SAVE_CHUNK_SIZE = 50;
