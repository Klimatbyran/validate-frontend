import { getUnearthApiBaseUrl } from "@/config/api-env";

const BASE = getUnearthApiBaseUrl();

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`.replace(/\/+/g, "/");
}
