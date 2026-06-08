/** Public Klimatkollen URL segment: prefer wikidataId, else 8-char UUID prefix. */
export function getCompanyUrlSegment(company: {
  id: string;
  wikidataId?: string | null;
}): string {
  return company.wikidataId ?? company.id.split("-")[0];
}

export function getKlimatkollenCompanyPath(company: {
  id: string;
  wikidataId?: string | null;
}): string {
  return `https://klimatkollen.se/companies/${getCompanyUrlSegment(company)}`;
}
