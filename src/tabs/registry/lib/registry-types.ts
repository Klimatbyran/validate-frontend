export interface RegistryEntry {
  companyName: string;
  wikidataId: string | null;
  reportYear: string;
  url: string;
}

export interface RegistryStats {
  total: number;
}
