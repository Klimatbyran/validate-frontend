/**
 * Errors tab: stage + prod Unearth API company lists (all reporting periods).
 */
import {
  getStagePipelineCompaniesListUrl,
  getProdPipelineCompaniesListUrl,
} from "@/config/api-env";

export {
  getStagePipelineCompaniesListUrl,
  getProdPipelineCompaniesListUrl,
} from "@/config/api-env";

/** @deprecated Use {@link getStagePipelineCompaniesListUrl} */
export function getStagePipelineCompaniesUrl(): string {
  return getStagePipelineCompaniesListUrl();
}

/** @deprecated Use {@link getProdPipelineCompaniesListUrl} */
export function getProdPipelineCompaniesUrl(): string {
  return getProdPipelineCompaniesListUrl();
}

/** @deprecated Use {@link getStagePipelineCompaniesListUrl} */
export function getStageApiUrl(): string {
  return getStagePipelineCompaniesListUrl();
}

/** @deprecated Use {@link getProdPipelineCompaniesListUrl} */
export function getProdApiUrl(): string {
  return getProdPipelineCompaniesListUrl();
}
