/**
 * API Helpers - Utilities for authenticated API calls
 * Provides authenticatedFetch for direct fetch() calls
 */

import { TOKEN_STORAGE_KEY } from "@/lib/auth-constants";

function isWriteOperation(method: string | undefined): boolean {
  const upperMethod = method?.toUpperCase() || "";
  return ["POST", "PUT", "PATCH", "DELETE"].includes(upperMethod);
}

/**
 * Authenticated fetch wrapper
 * Automatically checks for authentication on write operations
 * and shows login modal if not authenticated.
 *
 * Always attaches Bearer when a token is present so pipeline-api (and similar)
 * JWT gates pass on GETs as well as writes.
 *
 * @param url - Request URL
 * @param options - Fetch options (same as native fetch)
 * @returns Promise<Response>
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const isWrite = isWriteOperation(options.method);
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (isWrite && !token) {
    // Show login modal and return a promise that will be resolved after login
    return new Promise((resolve, reject) => {
      window.dispatchEvent(
        new CustomEvent("show-login-modal", {
          detail: {
            action: async () => {
              // Retry the fetch after login
              try {
                const nextToken = localStorage.getItem(TOKEN_STORAGE_KEY);
                if (!nextToken) {
                  reject(new Error("Authentication required"));
                  return;
                }

                const fetchOptions: RequestInit = {
                  ...options,
                  headers: {
                    ...options.headers,
                    Authorization: `Bearer ${nextToken}`,
                  },
                };

                const response = await fetch(url, fetchOptions);
                resolve(response);
              } catch (error) {
                reject(error);
              }
            },
          },
        }),
      );
      // Don't reject immediately - wait for login to complete
      // The promise will be resolved/rejected in the action callback
    });
  }

  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return fetch(url, options);
}
