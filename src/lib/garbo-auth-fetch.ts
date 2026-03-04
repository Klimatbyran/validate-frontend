/**
 * Authenticated fetch for Garbo API. Adds Bearer token from storage and handles
 * x-auth-token response header. Use for any Garbo endpoint that requires auth
 * (e.g. tag-options, future company-tags PATCH).
 */

import { TOKEN_STORAGE_KEY } from "@/lib/auth-constants";

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function handleAuthResponse(res: Response): void {
  const newToken = res.headers.get("x-auth-token");
  if (newToken && typeof localStorage !== "undefined") {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    window.dispatchEvent(new CustomEvent("token-updated", { detail: newToken }));
  }
}

export interface GarboAuthFetchOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

/**
 * Fetch with Garbo auth: Bearer token from storage, credentials: include.
 * On response, if x-auth-token header is present, updates storage and dispatches token-updated.
 */
export async function garboAuthFetch(
  url: string,
  options: GarboAuthFetchOptions = {}
): Promise<Response> {
  const { skipAuthRefresh, ...init } = options;
  const headers = new Headers(init.headers);
  Object.entries(getAuthHeaders()).forEach(([k, v]) => headers.set(k, v));
  const res = await fetch(url, { ...init, headers, credentials: "include" });
  if (!skipAuthRefresh) handleAuthResponse(res);
  return res;
}
