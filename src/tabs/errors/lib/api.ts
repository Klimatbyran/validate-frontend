/**
 * Errors tab: always stage + prod garbo (comparison).
 */
import { getStageGarboUrl, getProdGarboUrl } from "@/config/api-env";

const COMPANIES_PATH = "/api/companies";

export function getStageApiUrl(): string {
  return getStageGarboUrl(COMPANIES_PATH);
}

export function getProdApiUrl(): string {
  return getProdGarboUrl(COMPANIES_PATH);
}
