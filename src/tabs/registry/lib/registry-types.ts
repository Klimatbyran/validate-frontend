export interface RegistryEntry {
  id?: string;
  companyName?: string | null;
  wikidataId?: string | null;
  reportYear?: string | null;
  url: string;
  sourceUrl?: string | null;
  s3Url?: string | null;
  s3Key?: string | null;
  s3Bucket?: string | null;
  sha256?: string | null;
  batchId?: string | null;
  batchName?: string | null;
}

export interface RegistryEntryUpdate {
  id: string;
  companyName?: string;
  wikidataId?: string;
  reportYear?: string;
  url?: string;
  sourceUrl?: string | null;
  s3Url?: string | null;
  s3Key?: string | null;
  s3Bucket?: string | null;
  sha256?: string | null;
  batchId?: string | null;
}

export interface RegistryNewEntry {
  companyName?: string;
  wikidataId?: string;
  reportYear?: string;
  url: string;
  sourceUrl?: string;
  s3Url?: string;
  s3Key?: string;
  s3Bucket?: string;
  sha256?: string;
  /** Garbo Batch.id stored on the registry report row. */
  batchId?: string;
}

export type RegistryBulkProgress = {
  phase: "upload" | "save";
  completed: number;
  total: number;
};

/** Bulk add from dropped PDF files; metadata is optional (fill in later via edit). */
export interface RegistryBulkFileAddInput {
  companyName?: string;
  wikidataId?: string;
  reportYear?: string;
  sourceUrl?: string;
  files: File[];
  batchId?: string;
  onProgress?: (progress: RegistryBulkProgress) => void;
}

export interface RegistryStats {
  uniqueCompanies: number;
  totalReports: number;
}
