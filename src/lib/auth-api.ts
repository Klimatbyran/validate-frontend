/**
 * Auth API client - separate from pipeline API
 * Handles authentication endpoints on api.klimatkollen.se / stage-api.klimatkollen.se
 */

import axios from "axios";

/**
 * Get auth API base URL based on environment
 * Similar pattern to getPublicApiUrl in utils.ts
 *
 * Use VITE_AUTH_API=local to force local proxy (/api/auth -> localhost:3000)
 * when running dev or preview. Unset or "stage"/"prod" to use hostname-based URLs.
 */
function getAuthApiBaseUrl(): string {
  const forceLocal =
    import.meta.env.VITE_AUTH_API === "local" || import.meta.env.VITE_AUTH_API === "true";
  const isDev = import.meta.env.DEV;

  // In dev, or when explicitly forcing local, use proxy path (vite.config.ts -> localhost:3000)
  if (isDev || forceLocal) {
    return "/api/auth"; // Proxy will handle routing to localhost:3000
  }

  // In production/staging, use absolute URL with /api/auth path
  // Detect environment from hostname
  const hostname = window.location.hostname;
  if (hostname.includes("stage") || hostname.includes("staging")) {
    return "https://stage-api.klimatkollen.se/api/auth";
  }

  return "https://api.klimatkollen.se/api/auth";
}

/**
 * Create auth API client instance
 * Uses relative path in dev (via proxy), absolute URL in prod
 */
export const authApi = axios.create({
  baseURL: getAuthApiBaseUrl(),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/**
 * Authenticate with GitHub OAuth code
 * @param code OAuth code from GitHub callback
 * @param state Optional state parameter from GitHub callback
 * @returns JWT token and optional redirect_uri
 */
export async function authenticateWithGithub(
  code: string,
  state?: string | null
): Promise<{ token: string; redirect_uri?: string }> {
  const payload: { code: string; state?: string } = { code };
  if (state) {
    payload.state = state;
  }
  // baseURL already includes /api/auth, so just use /github
  try {
    const response = await authApi.post("/github", payload);
    return response.data;
  } catch (err: unknown) {
    const axiosError = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
    const msg =
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.message;
    throw new Error(msg || "Authentication failed");
  }
}

/**
 * Get the callback URL for OAuth redirect
 * Based on current environment.
 *
 * Override: set VITE_AUTH_CALLBACK_URL (e.g. http://localhost:5173/auth/callback)
 * if your OAuth app or backend only allows specific URLs. Otherwise we use
 * window.location.origin + '/auth/callback'.
 */
function getCallbackUrl(): string {
  const override = import.meta.env.VITE_AUTH_CALLBACK_URL;
  if (override && typeof override === "string" && override.trim() !== "") {
    return override.trim().replace(/\/$/, ""); // no trailing slash
  }
  return `${window.location.origin}/auth/callback`;
}

/**
 * Get GitHub OAuth initiation URL
 * Used for redirecting user to GitHub login
 * Includes redirect_uri parameter as required by the auth API
 *
 * Note: For browser navigation, we need absolute URLs in production
 * (can't use relative paths that go through proxy)
 */
export function getGithubAuthUrl(): string {
  const forceLocal =
    import.meta.env.VITE_AUTH_API === "local" || import.meta.env.VITE_AUTH_API === "true";
  const isDev = import.meta.env.DEV;
  const useLocalAuth = isDev || forceLocal;
  const callbackUrl = getCallbackUrl();
  const redirectUri = encodeURIComponent(callbackUrl);

  // In dev or when forcing local auth, use relative path (goes through Vite proxy)
  if (useLocalAuth) {
    return `/api/auth/github?redirect_uri=${redirectUri}`;
  }

  // In production, use absolute URL (browser navigation can't use proxy)
  // baseURL already includes /api/auth, so just append /github
  const baseUrl = getAuthApiBaseUrl();
  return `${baseUrl}/github?redirect_uri=${redirectUri}`;
}
