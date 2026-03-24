export interface RegistryEntry {
  companyName?: string | null;
  wikidataId?: string | null;
  reportYear?: string | null;
  url: string;
}

export interface RegistryStats {
  total: number;
}
