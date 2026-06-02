/**
 * Errors tab: always stage + prod garbo (comparison).
 */
import { getStageUnearthUrl, getProdUnearthUrl } from "@/config/api-env";

const COMPANIES_PATH = "/api/companies";

export function getStageApiUrl(): string {
  return getStageUnearthUrl(COMPANIES_PATH);
}

export function getProdApiUrl(): string {
  return getProdUnearthUrl(COMPANIES_PATH);
}
