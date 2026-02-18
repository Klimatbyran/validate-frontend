import { getPublicApiUrl } from '@/lib/utils';

/** Stage API URL for company data (dev proxy or direct). */
export function getStageApiUrl(): string {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return '/stagekkapi/api/companies';
  }
  return 'https://stage-api.klimatkollen.se/api/companies';
}

/** Prod API URL for company data. */
export function getProdApiUrl(): string {
  return getPublicApiUrl('/api/companies');
}
