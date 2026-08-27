/**
 * Shared auth constants. Used by AuthContext, pipeline API, garbo auth fetch, and api-helpers
 * so the token storage key stays in one place.
 */
export const TOKEN_STORAGE_KEY = "token";

/**
 * Vite dev server: GitHub login is not required for read APIs.
 * The proxy injects X-API-Key for Unearth internal routes (company list, etc.).
 * Writes still go through the login modal.
 */
export function allowUnauthenticatedReads(): boolean {
  return import.meta.env.DEV;
}
