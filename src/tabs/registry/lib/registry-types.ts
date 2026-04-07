export interface RegistryEntry {
  id?: string;
  companyName?: string | null;
  wikidataId?: string | null;
  reportYear?: string | null;
  url: string;
}

export interface RegistryEntryUpdate {
  id: string;
  companyName?: string;
  wikidataId?: string;
  reportYear?: string;
  url?: string;
}

export interface RegistryStats {
  total: number;
}
