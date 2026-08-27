import { listCompanies } from "./companies-api";
import { fetchTagOptions } from "./tag-options-api";
import type { GarboCompanyListItem, TagOption } from "./types";

/**
 * Load the editor company list. Tag options are best-effort so a 401/failure
 * there does not block company search.
 */
export async function loadCompaniesAndTagOptions(): Promise<{
  companies: GarboCompanyListItem[];
  tagOptions: TagOption[];
}> {
  const [companiesResult, tagsResult] = await Promise.allSettled([
    listCompanies(),
    fetchTagOptions(),
  ]);
  if (companiesResult.status === "rejected") {
    throw companiesResult.reason;
  }
  const tagOptions = tagsResult.status === "fulfilled" ? tagsResult.value : [];
  return { companies: companiesResult.value, tagOptions };
}
