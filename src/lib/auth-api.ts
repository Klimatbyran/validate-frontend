/**
 * Auth API client (garbo base + /auth). Follows garbo target (VITE_GARBO_TARGET or VITE_API_MODE).
 */

import axios from "axios";
import { getGarboApiBaseUrl } from "@/config/api-env";

export const authApi = axios.create({
  baseURL: getGarboApiBaseUrl() + "/auth",
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
 * Get GitHub OAuth initiation URL.
 * In dev uses relative path (Vite proxy); in production uses absolute URL.
 */
export function getGithubAuthUrl(): string {
  const callbackUrl = getCallbackUrl();
  const redirectUri = encodeURIComponent(callbackUrl);
  const base = getGarboApiBaseUrl() + "/auth";
  return `${base}/github?redirect_uri=${redirectUri}`;
}
