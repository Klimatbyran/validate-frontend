import { getGarboApiBaseUrl } from "@/config/api-env";

const BASE = getGarboApiBaseUrl();

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`.replace(/\/+/g, "/");
}

