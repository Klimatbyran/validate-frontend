/**
 * Auth API client - separate from pipeline API
 * Handles authentication endpoints on api.klimatkollen.se / stage.klimatkollen.se
 */

import axios from "axios";

/**
 * Get auth API base URL based on environment
 * Similar pattern to getPublicApiUrl in utils.ts
 */
function getAuthApiBaseUrl(): string {
  const isDev = import.meta.env.DEV;

  // In dev, use proxy path (configured in vite.config.ts)
  if (isDev) {
    return "/api/auth"; // Proxy will handle routing to localhost:3000
  }

  // In production/staging, use absolute URL with /api/auth path
  // Detect environment from hostname
  const hostname = window.location.hostname;
  if (hostname.includes("stage") || hostname.includes("staging")) {
    return "https://stage.klimatkollen.se/api/auth";
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
  const response = await authApi.post("/github", payload);
  return response.data;
}

/**
 * Get the callback URL for OAuth redirect
 * Based on current environment
 */
function getCallbackUrl(): string {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    // In dev, use current origin (localhost with port)
    return `${window.location.origin}/auth/callback`;
  }

  // In production/staging, use the current origin to ensure correct domain
  // This ensures we redirect back to the same frontend that initiated the OAuth flow
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
  const isDev = import.meta.env.DEV;
  const callbackUrl = getCallbackUrl();
  const redirectUri = encodeURIComponent(callbackUrl);

  // In dev, use relative path (goes through Vite proxy)
  if (isDev) {
    return `/api/auth/github?redirect_uri=${redirectUri}`;
  }

  // In production, use absolute URL (browser navigation can't use proxy)
  // baseURL already includes /api/auth, so just append /github
  const baseUrl = getAuthApiBaseUrl();
  return `${baseUrl}/github?redirect_uri=${redirectUri}`;
}
