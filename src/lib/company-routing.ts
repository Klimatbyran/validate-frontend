/** Public Klimatkollen URL segment: prefer wikidataId, else 8-char UUID prefix. */
export function getCompanyUrlSegment(company: {
  id: string;
  wikidataId?: string | null;
}): string {
  return company.wikidataId ?? company.id.split("-")[0];
}

