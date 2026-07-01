import { getUnearthApiBaseUrl } from "@/config/api-env";

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getUnearthApiBaseUrl()}${p}`.replace(/\/+/g, "/");
}
