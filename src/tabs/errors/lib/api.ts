/**
 * Errors tab API: always stage vs prod (comparison).
 * Use getStageApiUrl / getProdApiUrl so we always fetch both environments.
 */
import {
  getStageKkApiUrl,
  getProdKkApiUrl,
} from "@/config/api-env";

const COMPANIES_PATH = "/api/companies";

/** Stage API URL for company data. Use for comparison (always stage). */
export function getStageApiUrl(): string {
  return getStageKkApiUrl(COMPANIES_PATH);
}

/** Prod API URL for company data. Use for comparison (always prod). */
export function getProdApiUrl(): string {
  return getProdKkApiUrl(COMPANIES_PATH);
}
