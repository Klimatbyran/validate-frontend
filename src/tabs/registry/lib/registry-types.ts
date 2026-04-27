export interface RegistryEntry {
  id?: string;
  companyName?: string | null;
  wikidataId?: string | null;
  reportYear?: string | null;
  url: string;
  sourceUrl?: string | null;
  s3Url?: string | null;
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
}

export interface RegistryStats {
  total: number;
}
